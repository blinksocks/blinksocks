'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Hub = exports.CONN_STAGE_ERROR = exports.CONN_STAGE_FINISH = exports.CONN_STAGE_TRANSFER = exports.CONN_STAGE_INIT = exports.MAX_CONNECTIONS = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _libsodiumWrappers = require('libsodium-wrappers');

var _libsodiumWrappers2 = _interopRequireDefault(_libsodiumWrappers);

var _dgram = require('dgram');

var _dgram2 = _interopRequireDefault(_dgram);

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _url = require('url');

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

const MAX_CONNECTIONS = exports.MAX_CONNECTIONS = 50;

const CONN_STAGE_INIT = exports.CONN_STAGE_INIT = 0;
const CONN_STAGE_TRANSFER = exports.CONN_STAGE_TRANSFER = 1;
const CONN_STAGE_FINISH = exports.CONN_STAGE_FINISH = 2;
const CONN_STAGE_ERROR = exports.CONN_STAGE_ERROR = 3;

class Hub {

  constructor(config) {
    this._config = null;
    this._tcpServer = null;
    this._udpServer = null;
    this._tcpRelays = new Map();
    this._muxRelays = new Map();
    this._udpRelays = null;
    this._prevHrtime = process.hrtime();
    this._totalRead = 0;
    this._totalWritten = 0;
    this._prevTotalRead = 0;
    this._prevTotalWritten = 0;
    this._connQueue = [];
    this._udpCleanerTimer = null;

    this._onConnection = (socket, proxyRequest = null) => {
      _utils.logger.verbose(`[hub] [${socket.remoteAddress}:${socket.remotePort}] connected`);

      const sourceAddress = { host: socket.remoteAddress, port: socket.remotePort };

      const updateConnStatus = (event, extra) => {
        this._updateConnStatus(event, sourceAddress, extra);
      };

      updateConnStatus('new');

      const context = {
        socket,
        proxyRequest,
        remoteInfo: sourceAddress
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
          muxRelay.addSubRelay(cid, relay);
        } else {
          this._muxRelays.set(relay.id, relay);
        }
      }

      relay.on('_error', err => updateConnStatus('error', err.message));
      relay.on('_connect', targetAddress => updateConnStatus('target', targetAddress));
      relay.on('_read', size => this._totalRead += size);
      relay.on('_write', size => this._totalWritten += size);
      relay.on('close', () => {
        updateConnStatus('close');
        this._tcpRelays.delete(relay.id);
      });
      relay.init({ proxyRequest });

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

    this._udpServer && this._udpServer.close();

    this._tcpServer.close();

    this._connQueue = [];
    clearInterval(this._udpCleanerTimer);
    _utils.logger.info('[hub] shutdown');
  }

  async getConnections() {
    return new Promise((resolve, reject) => {
      if (this._tcpServer) {
        this._tcpServer.getConnections((err, count) => {
          if (err) {
            reject(err);
          } else {
            resolve(count);
          }
        });
      } else {
        resolve(0);
      }
    });
  }

  getTotalRead() {
    return this._totalRead;
  }

  getTotalWritten() {
    return this._totalWritten;
  }

  getUploadSpeed() {
    const [sec, nano] = process.hrtime(this._prevHrtime);
    const totalWritten = this._totalWritten;
    const diff = totalWritten - this._prevTotalWritten;
    const speed = Math.ceil(diff / (sec + nano / 1e9));
    this._prevTotalWritten = totalWritten;
    return speed;
  }

  getDownloadSpeed() {
    const [sec, nano] = process.hrtime(this._prevHrtime);
    const totalRead = this._totalRead;
    const diff = totalRead - this._prevTotalRead;
    const speed = Math.ceil(diff / (sec + nano / 1e9));
    this._prevTotalRead = totalRead;
    return speed;
  }

  getConnStatuses() {
    return this._connQueue;
  }

  async _createServer() {
    const { is_client, is_server, local_protocol } = this._config;
    if (is_client) {
      this._tcpServer = await this._createServerOnClient();
    } else {
      this._tcpServer = await this._createServerOnServer();
    }
    if (is_server || ['socks', 'socks5'].includes(local_protocol)) {
      this._udpServer = await this._createUdpServer();
    }
  }

  async _createServerOnClient() {
    return new Promise((resolve, reject) => {
      const { local_protocol, local_search_params, local_host, local_port } = this._config;
      const { local_username: username, local_password: password } = this._config;
      let server = null;
      switch (local_protocol) {
        case 'tcp':
          {
            const forward = local_search_params.get('forward');
            const { hostname, port } = new _url.URL('tcp://' + forward);
            const forwardHost = hostname;
            const forwardPort = +port;
            server = _proxies.tcp.createServer({ forwardHost, forwardPort });
            break;
          }
        case 'socks':
        case 'socks5':
        case 'socks4':
        case 'socks4a':
          server = _proxies.socks.createServer({ bindAddress: local_host, bindPort: local_port, username, password });
          break;
        case 'http':
        case 'https':
          server = _proxies.http.createServer({ username, password });
          break;
        default:
          return reject(Error(`unsupported protocol: "${local_protocol}"`));
      }
      const address = {
        host: local_host,
        port: local_port
      };
      server.on('proxyConnection', this._onConnection);
      server.on('error', reject);
      server.listen(address, () => {
        const service = `${local_protocol}://${local_host}:${local_port}`;
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
            server.getConnections = server._server.getConnections.bind(server._server);
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

      clearInterval(this._udpCleanerTimer);
      this._udpCleanerTimer = setInterval(() => relays.prune(), 5e3);

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
      const updateConnStatus = (event, extra) => {
        const sourceAddress = context.remoteInfo;
        this._updateConnStatus(event, sourceAddress, extra);
      };
      muxRelay = this._createRelay(context, true);
      muxRelay.on('_error', err => updateConnStatus('error', err.message));
      muxRelay.on('_connect', targetAddress => updateConnStatus('target', targetAddress));
      muxRelay.on('_read', size => this._totalRead += size);
      muxRelay.on('_write', size => this._totalWritten += size);
      muxRelay.on('close', () => {
        updateConnStatus('close');
        this._muxRelays.delete(muxRelay.id);
      });
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

  _updateConnStatus(event, sourceAddress, extra = null) {
    const conn = this._connQueue.find(({ sourceHost, sourcePort }) => sourceAddress.host === sourceHost && sourceAddress.port === sourcePort);
    switch (event) {
      case 'new':
        if (this._connQueue.length > MAX_CONNECTIONS) {
          this._connQueue.shift();
        }
        if (!conn) {
          this._connQueue.push({
            id: (0, _lodash2.default)('conn_'),
            stage: CONN_STAGE_INIT,
            startTime: Date.now(),
            sourceHost: sourceAddress.host,
            sourcePort: sourceAddress.port
          });
        }
        break;
      case 'target':
        if (conn) {
          const targetAddress = extra;
          conn.stage = CONN_STAGE_TRANSFER;
          conn.targetHost = targetAddress.host;
          conn.targetPort = targetAddress.port;
        }
        break;
      case 'close':
        if (conn && conn.stage !== CONN_STAGE_ERROR) {
          conn.stage = CONN_STAGE_FINISH;
          conn.endTime = Date.now();
        }
        break;
      case 'error':
        if (conn && conn.stage !== CONN_STAGE_FINISH) {
          conn.stage = CONN_STAGE_ERROR;
          conn.endTime = Date.now();
          conn.message = extra;
        }
        break;
    }
  }

}
exports.Hub = Hub;