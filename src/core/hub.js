import _sodium from 'libsodium-wrappers';
import dgram from 'dgram';
import net from 'net';
import tls from 'tls';
import ws from 'ws';
import LRU from 'lru-cache';
import uniqueId from 'lodash.uniqueid';
import { Config } from './config';
import { Relay } from './relay';
import { MuxRelay } from './mux-relay';
import { dumpHex, getRandomInt, hash, logger } from '../utils';
import { http, socks, tcp } from '../proxies';
import { APP_ID } from '../constants';

export class Hub {

  _config = null;

  _tcpServer = null;

  _udpServer = null;

  _tcpRelays = new Map(/* id: <Relay> */);

  _muxRelays = new Map(/* id: <MuxRelay> */);

  _udpRelays = null; // LRU cache

  constructor(config) {
    this._config = new Config(config);
    this._udpRelays = LRU({ max: 500, maxAge: 1e5, dispose: (_, relay) => relay.destroy() });
  }

  async run() {
    // libsodium-wrappers need to be loaded asynchronously
    // so we must wait for it ready before run our service.
    // Ref: https://github.com/jedisct1/libsodium.js#usage-as-a-module
    await _sodium.ready;
    if (!global.libsodium) {
      global.libsodium = _sodium;
    }
    if (this._tcpServer !== null) {
      await this.terminate();
    }
    try {
      await this._createServer();
    } catch (err) {
      logger.error('[hub] fail to create server:', err);
    }
  }

  async terminate() {
    // udp relays
    this._udpRelays.reset();
    // mux relays
    if (this._config.mux) {
      this._muxRelays.forEach((relay) => relay.destroy());
      this._muxRelays.clear();
    }
    // tcp relays
    this._tcpRelays.forEach((relay) => relay.destroy());
    this._tcpRelays.clear();
    // udp server
    this._udpServer.close();
    // server
    this._tcpServer.close();
    logger.info('[hub] shutdown');
  }

  async _createServer() {
    if (this._config.is_client) {
      this._tcpServer = await this._createServerOnClient();
    } else {
      this._tcpServer = await this._createServerOnServer();
    }
    this._udpServer = await this._createUdpServer();
  }

  async _createServerOnClient() {
    return new Promise((resolve, reject) => {
      let server = null;
      switch (this._config.local_protocol) {
        case 'tcp':
          server = tcp.createServer({ forwardHost: this._config.forward_host, forwardPort: this._config.forward_port });
          break;
        case 'socks':
        case 'socks5':
        case 'socks4':
        case 'socks4a':
          server = socks.createServer({ bindAddress: this._config.local_host, bindPort: this._config.local_port });
          break;
        case 'http':
        case 'https':
          server = http.createServer();
          break;
        default:
          return reject(Error(`unsupported protocol: "${this._config.local_protocol}"`));
      }
      const address = {
        host: this._config.local_host,
        port: this._config.local_port
      };
      server.on('proxyConnection', this._onConnection);
      server.listen(address, () => {
        const service = `${this._config.local_protocol}://${this._config.local_host}:${this._config.local_port}`;
        logger.info(`[hub] blinksocks client is running at ${service}`);
        resolve(server);
      });
    });
  }

  async _createServerOnServer() {
    return new Promise((resolve, reject) => {
      const address = {
        host: this._config.local_host,
        port: this._config.local_port
      };
      const onListening = (server) => {
        const service = `${this._config.local_protocol}://${this._config.local_host}:${this._config.local_port}`;
        logger.info(`[hub] blinksocks server is running at ${service}`);
        resolve(server);
      };
      switch (this._config.local_protocol) {
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
          const server = tls.createServer({ key: [this._config.tls_key], cert: [this._config.tls_cert] });
          server.on('secureConnection', this._onConnection);
          server.listen(address, () => onListening(server));
          break;
        }
        default:
          return reject(Error(`unsupported protocol: "${this._config.local_protocol}"`));
      }
    });
  }

  async _createUdpServer() {
    return new Promise((resolve, reject) => {
      const relays = this._udpRelays;
      const server = dgram.createSocket('udp4');

      server.on('message', (msg, rinfo) => {
        const { address, port } = rinfo;
        let proxyRequest = null;
        let packet = msg;
        if (this._config.is_client) {
          const parsed = socks.parseSocks5UdpRequest(msg);
          if (parsed === null) {
            logger.warn(`[hub] [${address}:${port}] drop invalid udp packet: ${dumpHex(msg)}`);
            return;
          }
          const { host, port, data } = parsed;
          proxyRequest = { host, port };
          packet = data;
        }
        const key = `${address}:${port}`;
        let relay = relays.get(key);
        if (relay === undefined) {
          const context = {
            socket: server,
            remoteInfo: { host: address, port: port }
          };
          relay = this._createUdpRelay(context);
          relay.init({ proxyRequest });
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

      // monkey patch for Socket.send() to meet Socks5 protocol
      if (this._config.is_client) {
        server.send = ((send) => (data, port, host, isSs, ...args) => {
          let packet = null;
          if (isSs) {
            // compatible with shadowsocks udp addressing
            packet = Buffer.from([0x00, 0x00, 0x00, ...data]);
          } else {
            packet = socks.encodeSocks5UdpResponse({ host, port, data });
          }
          send.call(server, packet, port, host, ...args);
        })(server.send);
      }

      server.bind({ address: this._config.local_host, port: this._config.local_port }, () => {
        const service = `udp://${this._config.local_host}:${this._config.local_port}`;
        logger.info(`[hub] blinksocks udp server is running at ${service}`);
        resolve(server);
      });
    });
  }

  _onConnection = (socket, proxyRequest = null) => {
    logger.verbose(`[hub] [${socket.remoteAddress}:${socket.remotePort}] connected`);

    const context = {
      socket,
      proxyRequest,
      remoteInfo: {
        host: socket.remoteAddress,
        port: socket.remotePort
      }
    };

    let muxRelay = null, cid = null;
    if (this._config.mux) {
      if (this._config.is_client) {
        // create a id for sub relay, this id is unique across applications
        cid = hash('sha256', uniqueId(APP_ID)).slice(-4).toString('hex');
        muxRelay = this._getMuxRelayOnClient(context, cid);
        context.muxRelay = muxRelay;
      } else {
        context.muxRelays = this._muxRelays;
      }
    }

    // create a relay for the current connection
    const relay = this._createRelay(context);

    // setup association between relay and muxRelay
    if (this._config.mux) {
      if (this._config.is_client) {
        relay.id = cid; // NOTE: this cid will be used in mux preset
        muxRelay.addSubRelay(relay);
      } else {
        // on server side, this relay is a muxRelay
        this._muxRelays.set(relay.id, relay);
      }
    }

    relay.init({ proxyRequest });
    relay.on('close', () => this._tcpRelays.delete(relay.id));

    this._tcpRelays.set(relay.id, relay);
  };

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
    const { proxyRequest } = context;
    if (muxRelay.isOutboundReady()) {
      proxyRequest.onConnected((buffer) => {
        // this callback is used for "http" proxy method on client side
        if (buffer) {
          muxRelay.encode(buffer, { ...proxyRequest, cid });
        }
      });
    } else {
      proxyRequest.cid = cid;
      muxRelay.init({ proxyRequest });
    }
    return muxRelay;
  }

  _createRelay(context, isMux = false) {
    const props = {
      config: this._config,
      context: context,
      transport: this._config.transport,
      presets: this._config.presets
    };
    if (isMux) {
      return new MuxRelay(props);
    }
    if (this._config.mux) {
      if (this._config.is_client) {
        return new Relay({ ...props, transport: 'mux', presets: [] });
      } else {
        return new MuxRelay(props);
      }
    } else {
      return new Relay(props);
    }
  }

  _createUdpRelay(context) {
    return new Relay({ config: this._config, transport: 'udp', context, presets: this._config.udp_presets });
  }

  _selectMuxRelay() {
    const relays = this._muxRelays;
    const concurrency = relays.size;
    if (concurrency < 1) {
      return null;
    }
    if (concurrency < this._config.mux_concurrency && getRandomInt(0, 1) === 0) {
      return null;
    }
    return relays.get([...relays.keys()][getRandomInt(0, concurrency - 1)]);
  }

}
