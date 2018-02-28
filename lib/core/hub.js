'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Hub = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _libsodiumWrappers = require('libsodium-wrappers');

var _libsodiumWrappers2 = _interopRequireDefault(_libsodiumWrappers);

var _dgram = require('dgram');

var _dgram2 = _interopRequireDefault(_dgram);

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _tls = require('tls');

var _tls2 = _interopRequireDefault(_tls);

var _ws = require('ws');

var _ws2 = _interopRequireDefault(_ws);

var _lruCache = require('lru-cache');

var _lruCache2 = _interopRequireDefault(_lruCache);

var _lodash = require('lodash.uniqueid');

var _lodash2 = _interopRequireDefault(_lodash);

var _config = require('./config');

var _relay = require('./relay');

var _muxRelay = require('./mux-relay');

var _utils = require('../utils');

var _proxies = require('../proxies');

var _constants = require('../constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Hub {

  constructor(config) {
    this._config = null;
    this._tcpServer = null;
    this._udpServer = null;
    this._tcpRelays = new Map();
    this._muxRelays = new Map();
    this._udpRelays = null;

    this._onConnection = (socket, proxyRequest = null) => {
      _utils.logger.verbose(`[hub] [${socket.remoteAddress}:${socket.remotePort}] connected`);

      const context = {
        socket,
        proxyRequest,
        remoteInfo: {
          host: socket.remoteAddress,
          port: socket.remotePort
        }
      };

      let muxRelay = null,
          cid = null;
      if (this._config.mux) {
        if (this._config.is_client) {
          cid = (0, _utils.hash)('sha256', (0, _lodash2.default)(_constants.APP_ID)).slice(-4).toString('hex');
          muxRelay = this._getMuxRelayOnClient(context, cid);
          context.muxRelay = muxRelay;
        } else {
          context.muxRelays = this._muxRelays;
        }
      }

      const relay = this._createRelay(context);

      if (this._config.mux) {
        if (this._config.is_client) {
          relay.id = cid;
          muxRelay.addSubRelay(relay);
        } else {
          this._muxRelays.set(relay.id, relay);
        }
      }

      relay.init({ proxyRequest });
      relay.on('close', () => this._tcpRelays.delete(relay.id));

      this._tcpRelays.set(relay.id, relay);
    };

    this._config = new _config.Config(config);
    this._udpRelays = (0, _lruCache2.default)({ max: 500, maxAge: 1e5, dispose: (_, relay) => relay.destroy() });
  }

  async run() {
    await _libsodiumWrappers2.default.ready;
    if (!global.libsodium) {
      global.libsodium = _libsodiumWrappers2.default;
    }

    if (this._tcpServer !== null) {
      await this.terminate();
    }

    await this._createServer();
  }

  async terminate() {
    this._udpRelays.reset();

    if (this._config.mux) {
      this._muxRelays.forEach(relay => relay.destroy());
      this._muxRelays.clear();
    }

    this._tcpRelays.forEach(relay => relay.destroy());
    this._tcpRelays.clear();

    this._udpServer.close();

    this._tcpServer.close();
    _utils.logger.info('[hub] shutdown');
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
          server = _proxies.tcp.createServer({ forwardHost: this._config.forward_host, forwardPort: this._config.forward_port });
          break;
        case 'socks':
        case 'socks5':
        case 'socks4':
        case 'socks4a':
          server = _proxies.socks.createServer({ bindAddress: this._config.local_host, bindPort: this._config.local_port });
          break;
        case 'http':
        case 'https':
          server = _proxies.http.createServer();
          break;
        default:
          return reject(Error(`unsupported protocol: "${this._config.local_protocol}"`));
      }
      const address = {
        host: this._config.local_host,
        port: this._config.local_port
      };
      server.on('proxyConnection', this._onConnection);
      server.on('error', reject);
      server.listen(address, () => {
        const service = `${this._config.local_protocol}://${this._config.local_host}:${this._config.local_port}`;
        _utils.logger.info(`[hub] blinksocks client is running at ${service}`);
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
      const onListening = server => {
        const service = `${this._config.local_protocol}://${this._config.local_host}:${this._config.local_port}`;
        _utils.logger.info(`[hub] blinksocks server is running at ${service}`);
        resolve(server);
      };
      let server = null;
      switch (this._config.local_protocol) {
        case 'tcp':
          {
            server = _net2.default.createServer();
            server.on('connection', this._onConnection);
            server.listen(address, () => onListening(server));
            break;
          }
        case 'ws':
          {
            server = new _ws2.default.Server(_extends({}, address, {
              perMessageDeflate: false
            }));
            server.on('connection', (ws, req) => {
              ws.remoteAddress = req.connection.remoteAddress;
              ws.remotePort = req.connection.remotePort;
              this._onConnection(ws);
            });
            server.on('listening', () => onListening(server));
            break;
          }
        case 'tls':
          {
            server = _tls2.default.createServer({ key: [this._config.tls_key], cert: [this._config.tls_cert] });
            server.on('secureConnection', this._onConnection);
            server.listen(address, () => onListening(server));
            break;
          }
        default:
          return reject(Error(`unsupported protocol: "${this._config.local_protocol}"`));
      }
      server.on('error', reject);
    });
  }

  async _createUdpServer() {
    return new Promise((resolve, reject) => {
      const relays = this._udpRelays;
      const server = _dgram2.default.createSocket('udp4');

      server.on('message', (msg, rinfo) => {
        const { address, port } = rinfo;
        let proxyRequest = null;
        let packet = msg;
        if (this._config.is_client) {
          const parsed = _proxies.socks.parseSocks5UdpRequest(msg);
          if (parsed === null) {
            _utils.logger.warn(`[hub] [${address}:${port}] drop invalid udp packet: ${(0, _utils.dumpHex)(msg)}`);
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
          relay.on('close', function onRelayClose() {});
          relays.set(key, relay);
          relays.prune();
        }
        if (relay._inbound) {
          relay._inbound.onReceive(packet, rinfo);
        }
      });

      server.on('error', reject);

      if (this._config.is_client) {
        server.send = (send => (data, port, host, isSs, ...args) => {
          let packet = null;
          if (isSs) {
            packet = Buffer.from([0x00, 0x00, 0x00, ...data]);
          } else {
            packet = _proxies.socks.encodeSocks5UdpResponse({ host, port, data });
          }
          send.call(server, packet, port, host, ...args);
        })(server.send);
      }

      server.bind({ address: this._config.local_host, port: this._config.local_port }, () => {
        const service = `udp://${this._config.local_host}:${this._config.local_port}`;
        _utils.logger.info(`[hub] blinksocks udp server is running at ${service}`);
        resolve(server);
      });
    });
  }

  _getMuxRelayOnClient(context, cid) {
    let muxRelay = this._selectMuxRelay();

    if (muxRelay === null) {
      muxRelay = this._createRelay(context, true);
      muxRelay.on('close', () => this._muxRelays.delete(muxRelay.id));
      this._muxRelays.set(muxRelay.id, muxRelay);
      _utils.logger.info(`[mux-${muxRelay.id}] create mux connection, total: ${this._muxRelays.size}`);
    }

    const { proxyRequest } = context;
    if (muxRelay.isOutboundReady()) {
      proxyRequest.onConnected(buffer => {
        if (buffer) {
          muxRelay.encode(buffer, _extends({}, proxyRequest, { cid }));
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
      return new _muxRelay.MuxRelay(props);
    }
    if (this._config.mux) {
      if (this._config.is_client) {
        return new _relay.Relay(_extends({}, props, { transport: 'mux', presets: [] }));
      } else {
        return new _muxRelay.MuxRelay(props);
      }
    } else {
      return new _relay.Relay(props);
    }
  }

  _createUdpRelay(context) {
    return new _relay.Relay({ config: this._config, transport: 'udp', context, presets: this._config.udp_presets });
  }

  _selectMuxRelay() {
    const relays = this._muxRelays;
    const concurrency = relays.size;
    if (concurrency < 1) {
      return null;
    }
    if (concurrency < this._config.mux_concurrency && (0, _utils.getRandomInt)(0, 1) === 0) {
      return null;
    }
    return relays.get([...relays.keys()][(0, _utils.getRandomInt)(0, concurrency - 1)]);
  }

}
exports.Hub = Hub;