import cluster from 'cluster';
import dgram from 'dgram';
import net from 'net';
import tls from 'tls';
import ws from 'ws';
import LRU from 'lru-cache';
import {Balancer} from './balancer';
import {Config} from './config';
import {Relay} from './relay';
import {MuxRelay} from './mux-relay';
import {dumpHex, getRandomInt, logger} from '../utils';
import {http, socks, tcp} from '../proxies';

export class Hub {

  _wkId = cluster.worker ? cluster.worker.id : 0;

  _tcpServer = null;

  _udpServer = null;

  _tcpRelays = new Map(/* id: <Relay> */);

  _muxRelays = new Map(/* id: <MuxRelay> */);

  _udpRelays = null; // LRU cache

  constructor(config) {
    Config.init(config);
    this._onConnection = this._onConnection.bind(this);
    this._udpRelays = LRU({
      max: 500,
      dispose: (key, relay) => relay.destroy(),
      maxAge: 1e5
    });
  }

  terminate(callback) {
    // relays
    this._udpRelays.reset();
    if (__MUX__) {
      this._muxRelays.forEach((relay) => relay.destroy());
      this._muxRelays.clear();
    }
    this._tcpRelays.forEach((relay) => relay.destroy());
    this._tcpRelays.clear();
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
      server.listen(address, () => {
        const service = `${__LOCAL_PROTOCOL__}://${__LOCAL_HOST__}:${__LOCAL_PORT__}`;
        logger.info(`[hub-${this._wkId}] blinksocks client is running at ${service}`);
        resolve(server);
      });
    });
  }

  async _createServerOnServer() {
    return new Promise((resolve, reject) => {
      const address = {
        host: __LOCAL_HOST__,
        port: __LOCAL_PORT__
      };
      const onListening = (server) => {
        const service = `${__LOCAL_PROTOCOL__}://${__LOCAL_HOST__}:${__LOCAL_PORT__}`;
        logger.info(`[hub-${this._wkId}] blinksocks server is running at ${service}`);
        resolve(server);
      };
      switch (__LOCAL_PROTOCOL__) {
        case 'tcp': {
          const server = net.createServer();
          server.on('connection', this._onConnection);
          server.listen(address, () => onListening(server));
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
          server.on('listening', () => onListening(server));
          break;
        }
        case 'tls': {
          const server = tls.createServer({key: [__TLS_KEY__], cert: [__TLS_CERT__]});
          server.on('secureConnection', this._onConnection);
          server.listen(address, () => onListening(server));
          break;
        }
        default:
          return reject(Error(`unsupported protocol: "${__LOCAL_PROTOCOL__}"`));
      }
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
          const context = {
            socket: server,
            remoteInfo: {host: address, port: port}
          };
          relay = this._createUdpRelay(context);
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

      server.bind({address: __LOCAL_HOST__, port: __LOCAL_PORT__}, () => {
        const service = `udp://${__LOCAL_HOST__}:${__LOCAL_PORT__}`;
        logger.info(`[hub-${this._wkId}] blinksocks udp server is running at ${service}`);
        resolve(server);
      });
    });
  }

  _onConnection(socket, proxyRequest = null) {
    logger.verbose(`[hub] [${socket.remoteAddress}:${socket.remotePort}] connected`);
    if (__IS_CLIENT__) {
      this._switchServer();
    }
    const context = {
      socket,
      proxyRequest,
      remoteInfo: {
        host: socket.remoteAddress,
        port: socket.remotePort
      }
    };

    let muxRelay = null, cid = null;
    if (__MUX__) {
      if (__IS_CLIENT__) {
        // get or create a mux relay
        muxRelay = this.getMuxRelay() || this._createMuxRelay(context);
        if (muxRelay.isOutboundReady()) {
          proxyRequest.onConnected((buffer) => {
            // this callback is used for "http" proxy method on client side
            if (buffer) {
              muxRelay.encode(buffer, {...proxyRequest, cid});
            }
          });
        } else {
          proxyRequest.cid = cid;
          muxRelay.init({proxyRequest});
        }
        // add mux relay instance to context
        Object.assign(context, {muxRelay});
      } else {
        Object.assign(context, {getMuxRelay: this.getMuxRelay.bind(this)});
      }
    }

    const relay = this._createRelay(context);
    relay.init({proxyRequest});
    relay.on('close', () => this.onRelayClose(relay));

    if (__MUX__) {
      if (__IS_CLIENT__) {
        muxRelay.addSubRelay(relay);
      } else {
        this._muxRelays.set(relay.id, relay);
      }
    }

    this._tcpRelays.set(relay.id, relay);
  }

  _createRelay(context) {
    const props = {
      context: context,
      transport: __TRANSPORT__,
      presets: __PRESETS__
    };
    if (__MUX__) {
      if (__IS_CLIENT__) {
        return new Relay({...props, transport: 'mux', presets: []});
      } else {
        return new MuxRelay(props);
      }
    } else {
      return new Relay(props);
    }
  }

  _createUdpRelay(context) {
    return new Relay({transport: 'udp', context, presets: __UDP_PRESETS__});
  }

  // client only
  _createMuxRelay(context) {
    const relay = new MuxRelay({transport: __TRANSPORT__, context, presets: __PRESETS__});
    relay.on('close', () => this.onRelayClose(relay));
    this._muxRelays.set(relay.id, relay);
    logger.info(`[mux-${relay.id}] create mux connection, total: ${this._muxRelays.size}`);
    return relay;
  }

  getMuxRelay() {
    const relays = this._muxRelays;
    const concurrency = relays.size;
    if (concurrency < 1) {
      return null;
    }
    if (__IS_CLIENT__ && concurrency < __MUX_CONCURRENCY__ && getRandomInt(0, 1) === 0) {
      return null;
    }
    return relays.get([...relays.keys()][getRandomInt(0, concurrency - 1)]);
  }

  onRelayClose(relay) {
    if (relay instanceof MuxRelay) {
      relay.destroy();
    }
    if (__MUX__ && __IS_CLIENT__) {
      const ctx = relay.getContext();
      if (ctx && ctx.muxRelay) {
        ctx.muxRelay.destroySubRelay(relay.id);
      }
    }
    this._tcpRelays.delete(relay.id);
    this._muxRelays.delete(relay.id);
  }

  _switchServer() {
    const server = Balancer.getFastest();
    if (server) {
      Config.initServer(server);
      logger.info(`[balancer-${this._wkId}] use server: ${__SERVER_HOST__}:${__SERVER_PORT__}`);
    }
  }

}
