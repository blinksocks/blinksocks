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

  _udpServer = null; // server side only

  _relays = [];

  _udpRelays = {}; // server side only

  constructor(config) {
    super();
    this._onConnection = this._onConnection.bind(this);
    this._onUdpAssociate = this._onUdpAssociate.bind(this);
    this._onClose = this._onClose.bind(this);
    if (config !== undefined) {
      Config.init(config);
    }
  }

  terminate() {
    this._onClose();
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
    if (this._isFirstWorker) {
      logger.info(`[hub] blinksocks ${__IS_CLIENT__ ? 'client' : 'server'} is running at ${__LOCAL_PROTOCOL__}://${__LOCAL_HOST__}:${__LOCAL_PORT__}`);
    }
  }

  async _createServer() {
    try {
      if (__IS_CLIENT__) {
        this._server = await this._createServerOnClient();
      } else {
        this._server = await this._createServerOnServer();
        this._udpServer = await this._createUdpServer();
      }
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
          server = socks.createServer();
          server.on('udpAssociate', this._onUdpAssociate);
          break;
        case 'http':
        case 'https':
          server = http.createServer();
          break;
        default:
          return reject(Error(`unsupported protocol: "${__LOCAL_PROTOCOL__}"`));
          break;
      }
      const address = {
        host: __LOCAL_HOST__,
        port: __LOCAL_PORT__
      };
      server.on('proxyConnection', this._onConnection);
      server.listen(address, () => resolve(server));
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
          break;
      }
    });
  }

  async _createUdpServer() {
    return new Promise((resolve, reject) => {
      const relays = this._udpRelays;
      const server = dgram.createSocket('udp4');

      server.on('message', (msg, rinfo) => {
        const {address, port} = rinfo;
        const key = `${address}:${port}`;
        if (relays[key] === undefined) {
          // TODO(refactor): pass remoteXXX to relay directly
          server.remoteAddress = address;
          server.remotePort = port;
          relays[key] = createRelay('udp', server);
          relays[key].on('close', () => delete relays[key]);
        }
        relays[key]._inbound.onReceive(msg, rinfo);
      });

      server.on('error', reject);

      // monkey patch for Socket.close() to prevent closing shared udp socket on server side
      // eslint-disable-next-line
      server.close = ((close) => (...args) => {
        // close.call(server, ...args);
      })(server.close);

      server.bind({address: __LOCAL_HOST__, port: __LOCAL_PORT__}, () => resolve(server));
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

  _onUdpAssociate(tcpSocket, done) {
    const socket = dgram.createSocket('udp4');

    let relay = null;

    socket.on('message', (msg, rinfo) => {
      const parsed = socks.parseSocks5UdpRequest(msg);
      if (parsed !== null) {
        const {host, port, data} = parsed;
        // create relay only once
        if (relay === null) {
          socket.remoteAddress = rinfo.address;
          socket.remotePort = rinfo.port;
          relay = createRelay('udp', socket, {host, port});
        }
        socket.emit('packet', data, rinfo);
      } else {
        logger.warn(`[hub] [${rinfo.address}:${rinfo.port}] drop invalid udp packet: ${msg.slice(0, 60).toString('hex')}`);
      }
    });

    socket.on('error', (err) => {
      logger.error('[hub] fail to create udp socket:', err);
    });

    // monkey patch for Socket.send() to support Socks5 protocol
    socket.send = ((send) => (data, port, host, ...args) => {
      const packet = socks.encodeSocks5UdpResponse({host, port, data});
      send.call(socket, packet, port, host, ...args);
    })(socket.send);

    socket.bind({address: __LOCAL_HOST__/*, port: random */}, () => {
      const {address, port} = socket.address();
      done({bindAddress: address, bindPort: port});
    });

    tcpSocket.on('close', () => {
      relay.destroy();
      relay = null;
    });
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

  _onClose() {
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
    if (__IS_SERVER__ && this._udpServer !== null) {
      this._udpServer._handle && this._udpServer.close();
      Object.keys(this._udpRelays).forEach((key) => this._udpRelays[key].destroy());
    }
    this.emit('close');
  }

}
