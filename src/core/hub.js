import cluster from 'cluster';
import dgram from 'dgram';
import net from 'net';
import tls from 'tls';
import ws from 'ws';
import LRU from 'lru-cache';
import uniqueId from 'lodash.uniqueid';
import * as MiddlewareManager from './middleware';
import {Balancer} from './balancer';
import {Config} from './config';
import {MuxClient, MuxServer} from './multiplexer';
import {Relay} from './relay';
import {dumpHex, logger} from '../utils';
import {http, socks, tcp} from '../proxies';

export class Hub {

  _wkId = cluster.worker ? cluster.worker.id : 0;

  _tcpServer = null;

  _udpServer = null;

  _mux = null;

  _tcpRelays = new Map(/* id: <relay> */);

  _udpRelays = null; // LRU cache

  constructor(config) {
    Config.init(config);
    this._onConnection = this._onConnection.bind(this);
    this._udpRelays = LRU({
      max: 500,
      dispose: (key, relay) => relay.destroy(),
      maxAge: 1e5
    });
    this._mux = __IS_CLIENT__ ? new MuxClient() : new MuxServer();
  }

  terminate(callback) {
    // relays
    this._udpRelays.reset();
    this._tcpRelays.forEach((relay) => relay.destroy());
    this._tcpRelays.clear();
    MiddlewareManager.cleanup();
    // balancer
    if (__IS_CLIENT__) {
      Balancer.destroy();
      logger.info(`[balancer-${this._wkId}] stopped`);
    }
    // server
    this._tcpServer.close();
    logger.info(`[hub-${this._wkId}] shutdown`);
    // udp server
    this._udpServer.close();
    typeof callback === 'function' && callback();
  }

  async run() {
    if (this._tcpServer !== null) {
      this.terminate();
    }
    if (__IS_CLIENT__) {
      Balancer.start(__SERVERS__);
      logger.info(`[balancer-${this._wkId}] started`);
      this._switchServer();
    }
    try {
      await this._createServer();
    } catch (err) {
      logger.error('[hub] fail to create server:', err);
      process.exit(-1);
    }
  }

  async _createServer() {
    if (__IS_CLIENT__) {
      this._tcpServer = await this._createServerOnClient();
    } else {
      this._tcpServer = await this._createServerOnServer();
    }
    this._udpServer = await this._createUdpServer();
  }

  async _createServerOnClient() {
    return new Promise((resolve, reject) => {
      let server = null;
      switch (__LOCAL_PROTOCOL__) {
        case 'tcp':
          server = tcp.createServer({forwardHost: __FORWARD_HOST__, forwardPort: __FORWARD_PORT__});
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
      logger.info(`[hub-${this._wkId}] blinksocks client is running at ${__LOCAL_PROTOCOL__}://${__LOCAL_HOST__}:${__LOCAL_PORT__}`);
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
      logger.info(`[hub-${this._wkId}] blinksocks server is running at ${__LOCAL_PROTOCOL__}://${__LOCAL_HOST__}:${__LOCAL_PORT__}`);
    });
  }

  async _createUdpServer() {
    return new Promise((resolve, reject) => {
      const relays = this._udpRelays;
      const server = dgram.createSocket('udp4');

      server.on('message', (msg, rinfo) => {
        const {address, port} = rinfo;
        let proxyRequest = null;
        let packet = msg;
        if (__IS_CLIENT__) {
          const parsed = socks.parseSocks5UdpRequest(msg);
          if (parsed === null) {
            logger.warn(`[hub] [${address}:${port}] drop invalid udp packet: ${dumpHex(msg)}`);
            return;
          }
          const {host, port, data} = parsed;
          proxyRequest = {host, port};
          packet = data;
        }
        const key = `${address}:${port}`;
        let relay = relays.get(key);
        if (relay === undefined) {
          server.remoteAddress = address;
          server.remotePort = port;
          relay = new Relay({transport: 'udp', presets: __PRESETS__, context: server});
          relay.init({proxyRequest});
          relay.on('close', function onRelayClose() {
            // relays.del(key);
          });
          relays.set(key, relay);
          relays.prune(); // destroy old relays every time a new relay created
        }
        if (relay._inbound) {
          relay._inbound.onReceive(packet, rinfo);
        }
      });

      server.on('error', reject);

      // monkey patch for Socket.close() to prevent closing shared udp socket
      // eslint-disable-next-line
      server.close = ((/* close */) => (...args) => {
        // close.call(server, ...args);
      })(server.close);

      // monkey patch for Socket.send() to meet Socks5 protocol
      if (__IS_CLIENT__) {
        server.send = ((send) => (data, port, host, isSs, ...args) => {
          let packet = null;
          if (isSs) {
            // compatible with shadowsocks udp addressing
            packet = Buffer.from([0x00, 0x00, 0x00, ...data]);
          } else {
            packet = socks.encodeSocks5UdpResponse({host, port, data});
          }
          send.call(server, packet, port, host, ...args);
        })(server.send);
      }

      server.bind({address: __LOCAL_HOST__, port: __LOCAL_PORT__}, () => resolve(server));

      logger.info(`[hub-${this._wkId}] blinksocks udp server is running at udp://${__LOCAL_HOST__}:${__LOCAL_PORT__}`);
    });
  }

  _onConnection(context, proxyRequest = null) {
    if (__IS_CLIENT__) {
      this._switchServer();
    }
    logger.verbose(`[hub] [${context.remoteAddress}:${context.remotePort}] connected`);
    let relay = null;
    if (__MUX__ && __IS_SERVER__) {
      relay = new Relay({context, transport: 'mux', presets: [{'name': 'mux'}], isMux: true});
    } else {
      relay = new Relay({context, transport: __TRANSPORT__, presets: __PRESETS__});
    }
    relay.init({proxyRequest});
    relay.id = uniqueId() | 0;
    relay.on('close', () => this._tcpRelays.delete(relay.id));
    this._tcpRelays.set(relay.id, relay);
    if (__MUX__) {
      __IS_CLIENT__ ? this._mux.couple(relay, proxyRequest) : this._mux.decouple(relay);
    }
  }

  _switchServer() {
    const server = Balancer.getFastest();
    if (server) {
      Config.initServer(server);
      logger.info(`[balancer-${this._wkId}] use server: ${__SERVER_HOST__}:${__SERVER_PORT__}`);
    }
  }

}
