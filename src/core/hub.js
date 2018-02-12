import cluster from 'cluster';
import dgram from 'dgram';
import net from 'net';
import tls from 'tls';
import ws from 'ws';
import LRU from 'lru-cache';
import uniqueId from 'lodash.uniqueid';
import {Balancer} from './balancer';
import {Config} from './config';
import {Relay} from './relay';
import {MuxRelay} from './mux-relay';
import {dumpHex, getRandomInt, hash, logger} from '../utils';
import {http, socks, tcp} from '../proxies';
import {APP_ID} from '../constants';

/**
 * create an connection id, this id is unique across applications
 * @returns {string}
 */
function makeConnID() {
  return hash('sha256', uniqueId(APP_ID)).slice(-4).toString('hex');
}

export class Hub {

  _wkId = cluster.worker ? cluster.worker.id : 0;

  _tcpServer = null;

  _udpServer = null;

  _tcpRelays = new Map(/* id: <Relay> */);

  _muxRelays = new Map(/* id: <MuxRelay> */);

  _udpRelays = null; // LRU cache

  _ctx = null;

  constructor(config) {
    this._ctx = new Config(config);
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
    if (this._ctx.MUX) {
      this._muxRelays.forEach((relay) => relay.destroy());
      this._muxRelays.clear();
    }
    this._tcpRelays.forEach((relay) => relay.destroy());
    this._tcpRelays.clear();
    // balancer
    if (this._ctx.IS_CLIENT) {
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
    if (this._ctx.IS_CLIENT) {
      Balancer.start(this._ctx.SERVERS);
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
    if (this._ctx.IS_CLIENT) {
      this._tcpServer = await this._createServerOnClient();
    } else {
      this._tcpServer = await this._createServerOnServer();
    }
    this._udpServer = await this._createUdpServer();
  }

  async _createServerOnClient() {
    return new Promise((resolve, reject) => {
      let server = null;
      switch (this._ctx.LOCAL_PROTOCOL) {
        case 'tcp':
          server = tcp.createServer({forwardHost: this._ctx.FORWARD_HOST, forwardPort: this._ctx.FORWARD_PORT});
          break;
        case 'socks':
        case 'socks5':
        case 'socks4':
        case 'socks4a':
          server = socks.createServer({bindAddress: this._ctx.LOCAL_HOST, bindPort: this._ctx.LOCAL_PORT});
          break;
        case 'http':
        case 'https':
          server = http.createServer();
          break;
        default:
          return reject(Error(`unsupported protocol: "${this._ctx.LOCAL_PROTOCOL}"`));
      }
      const address = {
        host: this._ctx.LOCAL_HOST,
        port: this._ctx.LOCAL_PORT
      };
      server.on('proxyConnection', this._onConnection);
      server.listen(address, () => {
        const service = `${this._ctx.LOCAL_PROTOCOL}://${this._ctx.LOCAL_HOST}:${this._ctx.LOCAL_PORT}`;
        logger.info(`[hub-${this._wkId}] blinksocks client is running at ${service}`);
        resolve(server);
      });
    });
  }

  async _createServerOnServer() {
    return new Promise((resolve, reject) => {
      const address = {
        host: this._ctx.LOCAL_HOST,
        port: this._ctx.LOCAL_PORT
      };
      const onListening = (server) => {
        const service = `${this._ctx.LOCAL_PROTOCOL}://${this._ctx.LOCAL_HOST}:${this._ctx.LOCAL_PORT}`;
        logger.info(`[hub-${this._wkId}] blinksocks server is running at ${service}`);
        resolve(server);
      };
      switch (this._ctx.LOCAL_PROTOCOL) {
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
          const server = tls.createServer({key: [this._ctx.TLS_KEY], cert: [this._ctx.TLS_CERT]});
          server.on('secureConnection', this._onConnection);
          server.listen(address, () => onListening(server));
          break;
        }
        default:
          return reject(Error(`unsupported protocol: "${this._ctx.LOCAL_PROTOCOL}"`));
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
        if (this._ctx.IS_CLIENT) {
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
      if (this._ctx.IS_CLIENT) {
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

      server.bind({address: this._ctx.LOCAL_HOST, port: this._ctx.LOCAL_PORT}, () => {
        const service = `udp://${this._ctx.LOCAL_HOST}:${this._ctx.LOCAL_PORT}`;
        logger.info(`[hub-${this._wkId}] blinksocks udp server is running at ${service}`);
        resolve(server);
      });
    });
  }

  _onConnection(socket, proxyRequest = null) {
    logger.verbose(`[hub] [${socket.remoteAddress}:${socket.remotePort}] connected`);
    if (this._ctx.IS_CLIENT) {
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
    if (this._ctx.MUX) {
      if (this._ctx.IS_CLIENT) {
        cid = makeConnID();
        muxRelay = this._getMuxRelayOnClient(context, cid);
        context.muxRelay = muxRelay;
      } else {
        context.muxRelays = this._muxRelays;
      }
    }

    // create a relay for the current connection
    const relay = this._createRelay(context);

    // setup association between relay and muxRelay
    if (this._ctx.MUX) {
      if (this._ctx.IS_CLIENT) {
        relay.id = cid; // NOTE: this cid will be used in mux preset
        muxRelay.addSubRelay(relay);
      } else {
        // on server side, this relay is a muxRelay
        this._muxRelays.set(relay.id, relay);
      }
    }

    relay.init({proxyRequest});
    relay.on('close', () => this._tcpRelays.delete(relay.id));

    this._tcpRelays.set(relay.id, relay);
  }

  _getMuxRelayOnClient(context, cid) {
    // get a mux relay
    let muxRelay = this._selectMuxRelay();

    // create a mux relay if needed
    if (muxRelay === null) {
      muxRelay = this._createRelay(context, true);
      muxRelay.on('close', () => this._muxRelays.delete(muxRelay.id));
      this._muxRelays.set(muxRelay.id, muxRelay);
      logger.info(`[mux-${muxRelay.id}] create mux connection, total: ${this._muxRelays.size}`);
    }

    // determine how to initialize the muxRelay
    const {proxyRequest} = context;
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
    return muxRelay;
  }

  _createRelay(context, isMux = false) {
    const props = {
      context: context,
      transport: this._ctx.TRANSPORT,
      presets: this._ctx.PRESETS
    };
    if (isMux) {
      return new MuxRelay(props, this._ctx);
    }
    if (this._ctx.MUX) {
      if (this._ctx.IS_CLIENT) {
        return new Relay({...props, transport: 'mux', presets: []}, this._ctx);
      } else {
        return new MuxRelay(props, this._ctx);
      }
    } else {
      return new Relay(props, this._ctx);
    }
  }

  _createUdpRelay(context) {
    return new Relay({transport: 'udp', context, presets: this._ctx.UDP_PRESETS}, this._ctx);
  }

  _selectMuxRelay() {
    const relays = this._muxRelays;
    const concurrency = relays.size;
    if (concurrency < 1) {
      return null;
    }
    if (concurrency < this._ctx.MUX_CONCURRENCY && getRandomInt(0, 1) === 0) {
      return null;
    }
    return relays.get([...relays.keys()][getRandomInt(0, concurrency - 1)]);
  }

  _switchServer() {
    const server = Balancer.getFastest();
    if (server) {
      Config.initServer(server);
      logger.info(`[balancer-${this._wkId}] use server: ${this._ctx.SERVER_HOST}:${this._ctx.SERVER_PORT}`);
    }
  }

}
