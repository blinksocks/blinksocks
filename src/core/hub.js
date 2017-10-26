import cluster from 'cluster';
import EventEmitter from 'events';
import dgram from 'dgram';
import net from 'net';
import tls from 'tls';
import ws from 'ws';
import {Balancer} from './balancer';
import {Config} from './config';
import * as MiddlewareManager from './middleware';
import {createRelay} from './relay';
import {logger} from '../utils';
import {tcp, http, socks} from '../proxies';

/**
 * @description
 *   gather and manage connections.
 *
 * @events
 *   .on('close');
 */
export class Hub extends EventEmitter {

  _isFirstWorker = cluster.worker ? (cluster.worker.id <= 1) : true;

  _fastestServer = null;

  _server = null;

  _udpServer = null;

  _relays = [];

  _udpRelays = {};

  constructor(config) {
    super();
    this._onConnection = this._onConnection.bind(this);
    if (config !== undefined) {
      Config.init(config);
    }
  }

  terminate() {
    // relays
    this._relays.forEach((relay) => relay.destroy());
    MiddlewareManager.cleanup();
    // balancer
    if (__IS_CLIENT__) {
      Balancer.destroy();
      this._isFirstWorker && logger.info('[balancer] stopped');
    }
    // server
    this._server.close();
    this._isFirstWorker && logger.info('[hub] shutdown');
    // udp server
    if (this._udpServer !== null) {
      this._udpServer._handle && this._udpServer.close();
      Object.keys(this._udpRelays).forEach((key) => this._udpRelays[key].destroy());
    }
    this.emit('close');
  }

  async run() {
    if (this._server !== null) {
      this.terminate();
    }
    if (__IS_CLIENT__) {
      Balancer.start(__SERVERS__);
      this._isFirstWorker && logger.info('[balancer] started');
      this._selectServer();
    }
    await this._createServer();
  }

  async _createServer() {
    try {
      if (__IS_CLIENT__) {
        this._server = await this._createServerOnClient();
      } else {
        this._server = await this._createServerOnServer();
      }
      this._udpServer = await this._createUdpServer();
    } catch (err) {
      logger.error('[hub] fail to create server:', err);
      process.exit(-1);
    }
  }

  async _createServerOnClient() {
    return new Promise((resolve, reject) => {
      let server = null;
      switch (__LOCAL_PROTOCOL__) {
        case 'tcp':
          server = tcp.createServer();
          break;
        case 'socks':
        case 'socks5':
        case 'socks4':
        case 'socks4a':
          server = socks.createServer({bindAddress: __LOCAL_HOST__, bindPort: __LOCAL_PORT__});
          break;
        case 'http':
        case 'https':
          server = http.createServer();
          break;
        default:
          return reject(Error(`unsupported protocol: "${__LOCAL_PROTOCOL__}"`));
      }
      const address = {
        host: __LOCAL_HOST__,
        port: __LOCAL_PORT__
      };
      server.on('proxyConnection', this._onConnection);
      server.listen(address, () => resolve(server));
      if (this._isFirstWorker) {
        logger.info(`[hub] blinksocks client is running at ${__LOCAL_PROTOCOL__}://${__LOCAL_HOST__}:${__LOCAL_PORT__}`);
      }
    });
  }

  async _createServerOnServer() {
    return new Promise((resolve, reject) => {
      const address = {
        host: __LOCAL_HOST__,
        port: __LOCAL_PORT__
      };
      switch (__LOCAL_PROTOCOL__) {
        case 'tcp': {
          const server = net.createServer();
          server.on('connection', this._onConnection);
          server.listen(address, () => resolve(server));
          break;
        }
        case 'ws': {
          const server = new ws.Server({
            ...address,
            perMessageDeflate: false
          });
          server.on('connection', (ws, req) => {
            ws.remoteAddress = req.connection.remoteAddress;
            ws.remotePort = req.connection.remotePort;
            this._onConnection(ws);
          });
          server.on('listening', () => resolve(server));
          break;
        }
        case 'tls': {
          const server = tls.createServer({key: [__TLS_KEY__], cert: [__TLS_CERT__]});
          server.on('secureConnection', this._onConnection);
          server.listen(address, () => resolve(server));
          break;
        }
        default:
          return reject(Error(`unsupported protocol: "${__LOCAL_PROTOCOL__}"`));
      }
      if (this._isFirstWorker) {
        logger.info(`[hub] blinksocks server is running at ${__LOCAL_PROTOCOL__}://${__LOCAL_HOST__}:${__LOCAL_PORT__}`);
      }
    });
  }

  async _createUdpServer() {
    return new Promise((resolve, reject) => {
      const relays = this._udpRelays;
      const server = dgram.createSocket('udp4');

      server.on('message', (msg, rinfo) => {
        let proxyRequest = null;
        let packet = msg;
        if (__IS_CLIENT__) {
          const parsed = socks.parseSocks5UdpRequest(msg);
          if (parsed === null) {
            logger.warn(`[hub] [${rinfo.address}:${rinfo.port}] drop invalid udp packet: ${msg.slice(0, 60).toString('hex')}`);
            return;
          }
          const {host, port, data} = parsed;
          proxyRequest = {host, port};
          packet = data;
        }
        const {address, port} = rinfo;
        const key = `${address}:${port}`;
        if (relays[key] === undefined) {
          server.remoteAddress = address;
          server.remotePort = port;
          relays[key] = createRelay('udp', server, proxyRequest);
          relays[key].on('close', () => delete relays[key]);
        }
        relays[key]._inbound.onReceive(packet, rinfo);
      });

      server.on('error', reject);

      // monkey patch for Socket.close() to prevent closing shared udp socket
      // eslint-disable-next-line
      server.close = ((close) => (...args) => {
        // close.call(server, ...args);
      })(server.close);

      // monkey patch for Socket.send() to meet Socks5 protocol
      if (__IS_CLIENT__) {
        const isShadowsocks = function () {
          return __PRESETS__.some(({name}) => ['ss-base'].includes(name));
        };
        server.send = ((send) => (data, port, host, ...args) => {
          let packet = null;
          if (isShadowsocks()) {
            // compatible with shadowsocks udp addressing
            packet = Buffer.from([0x00, 0x00, 0x00, ...data]);
          } else {
            packet = socks.encodeSocks5UdpResponse({host, port, data});
          }
          send.call(server, packet, port, host, ...args);
        })(server.send);
      }

      server.bind({address: __LOCAL_HOST__, port: __LOCAL_PORT__}, () => resolve(server));

      if (this._isFirstWorker) {
        logger.info(`[hub] blinksocks udp server is running at udp://${__LOCAL_HOST__}:${__LOCAL_PORT__}`);
      }
    });
  }

  _selectServer() {
    const server = Balancer.getFastest();
    if (this._fastestServer === null || server.id !== this._fastestServer.id) {
      this._fastestServer = server;
      Config.initServer(server);
      MiddlewareManager.reset();
      logger.info(`[balancer] use server: ${__SERVER_HOST__}:${__SERVER_PORT__}`);
    }
  }

  _onConnection(context, proxyRequest = null) {
    if (__IS_CLIENT__) {
      this._selectServer();
    }
    logger.verbose(`[hub] [${context.remoteAddress}:${context.remotePort}] connected`);
    const relay = createRelay(__TRANSPORT__, context, proxyRequest);
    relay.on('close', () => {
      this._relays = this._relays.filter((r) => r.id !== relay.id);
    });
    this._relays.push(relay);
  }

}
