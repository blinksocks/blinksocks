'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Hub = exports.CONN_STAGE_ERROR = exports.CONN_STAGE_FINISH = exports.CONN_STAGE_TRANSFER = exports.CONN_STAGE_INIT = exports.MAX_CONNECTIONS = undefined;

var _dgram = require('dgram');

var _dgram2 = _interopRequireDefault(_dgram);

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

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
    this._udpRelays = null;
    this._upSpeedTester = null;
    this._dlSpeedTester = null;
    this._totalRead = 0;
    this._totalWritten = 0;
    this._connQueue = [];
    this._udpCleanerTimer = null;

    this._onRead = size => {
      this._totalRead += size;
      this._dlSpeedTester.feed(size);
    };

    this._onWrite = size => {
      this._totalWritten += size;
      this._upSpeedTester.feed(size);
    };

    this._onClientConnection = (conn, proxyRequest) => {
      const source = this._getSourceAddress(conn);
      const updateConnStatus = (event, extra) => this._updateConnStatus(event, source, extra);

      _utils.logger.verbose(`[hub] [${source.host}:${source.port}] connected`);
      updateConnStatus('new');
      updateConnStatus('target', { host: proxyRequest.host, port: proxyRequest.port });

      const context = { conn, source };

      if (this._config.mux && this._tcpRelays.size > 0) {
        const { value: relay } = this._tcpRelays.values().next();
        relay.addInboundOnClient(context, proxyRequest);
        return;
      }

      const relay = this._createRelay(source);
      relay.__id = (0, _lodash2.default)('relay_');
      relay.on('_error', err => updateConnStatus('error', err.message));
      relay.on('_read', this._onRead);
      relay.on('_write', this._onWrite);
      relay.on('close', () => {
        updateConnStatus('close');
        this._tcpRelays.delete(relay.__id);
      });

      relay.addInboundOnClient(context, proxyRequest);

      this._tcpRelays.set(relay.__id, relay);
    };

    this._onServerConnection = conn => {
      const source = this._getSourceAddress(conn);
      const updateConnStatus = (event, extra) => this._updateConnStatus(event, source, extra);

      _utils.logger.verbose(`[hub] [${source.host}:${source.port}] connected`);
      updateConnStatus('new');

      const relay = this._createRelay(source);
      relay.__id = (0, _lodash2.default)('relay_');
      relay.on('_error', err => updateConnStatus('error', err.message));
      relay.on('_connect', targetAddress => updateConnStatus('target', targetAddress));
      relay.on('_read', this._onRead);
      relay.on('_write', this._onWrite);
      relay.on('close', () => {
        updateConnStatus('close');
        this._tcpRelays.delete(relay.__id);
      });

      relay.addInboundOnServer({ source, conn });

      this._tcpRelays.set(relay.__id, relay);
    };

    this._config = new _config.Config(config);
    this._udpRelays = (0, _lruCache2.default)({ max: 500, maxAge: 1e5, dispose: (_, relay) => relay.destroy() });
    this._upSpeedTester = new _utils.SpeedTester();
    this._dlSpeedTester = new _utils.SpeedTester();
  }

  async run() {
    await this._config._ready;

    if (this._tcpServer !== null) {
      await this.terminate();
    }

    await this._createServer();
  }

  async terminate() {
    this._udpRelays.reset();

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
    return this._upSpeedTester.getSpeed();
  }

  getDownloadSpeed() {
    return this._dlSpeedTester.getSpeed();
  }

  getConnStatuses() {
    return this._connQueue;
  }

  async _createServer() {
    const { is_client, is_server, local_protocol, mux } = this._config;
    if (mux) {
      _utils.logger.info('[hub] multiplexing enabled');
    }
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
      const { local_protocol, local_search_params, local_host, local_port, local_pathname } = this._config;
      const { local_username: username, local_password: password } = this._config;
      const { https_key, https_cert } = this._config;
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
          server = _proxies.socks.createServer({
            bindAddress: local_host,
            bindPort: local_port,
            username,
            password
          });
          break;
        case 'http':
        case 'https':
          server = _proxies.http.createServer({
            secure: local_protocol === 'https',
            https_key,
            https_cert,
            username,
            password
          });
          break;
        default:
          return reject(Error(`unsupported protocol: "${local_protocol}"`));
      }
      const address = {
        host: local_host,
        port: local_port
      };
      server.on('proxyConnection', this._onClientConnection);
      server.on('error', reject);
      server.listen(address, () => {
        const service = `${local_protocol}://${local_host}:${local_port}` + (local_pathname ? local_pathname : '');
        _utils.logger.info(`[hub] blinksocks client is running at ${service}`);
        resolve(server);
      });
    });
  }

  async _createServerOnServer() {
    const { local_protocol, local_host, local_port, local_pathname, tls_key, tls_cert } = this._config;
    return new Promise((resolve, reject) => {
      let server = null;
      switch (local_protocol) {
        case 'tcp':
          {
            server = _net2.default.createServer();
            server.on('connection', this._onServerConnection);
            break;
          }
        case 'wss':
        case 'ws':
          {
            if (local_protocol === 'wss') {
              server = _https2.default.createServer({ key: tls_key, cert: tls_cert });
            } else {
              server = _http2.default.createServer();
            }
            const wss = new _ws2.default.Server({
              server: server,
              path: local_pathname,
              perMessageDeflate: false
            });
            wss.getConnections = wss._server.getConnections.bind(wss._server);
            wss.on('connection', (ws, req) => {
              ws.remoteAddress = req.connection.remoteAddress;
              ws.remotePort = req.connection.remotePort;
              this._onServerConnection(ws);
            });
            break;
          }
        case 'tls':
          {
            server = _tls2.default.createServer({ key: tls_key, cert: tls_cert });
            server.on('secureConnection', this._onServerConnection);
            break;
          }
        case 'h2':
          {
            server = require('http2').createSecureServer({ key: tls_key, cert: tls_cert });
            server.on('stream', stream => this._onServerConnection(stream));
            break;
          }
        default:
          return reject(Error(`unsupported protocol: "${local_protocol}"`));
      }
      const address = {
        host: local_host,
        port: local_port
      };
      server.on('error', reject);
      server.listen(address, () => {
        const service = `${local_protocol}://${local_host}:${local_port}` + (local_pathname ? local_pathname : '');
        _utils.logger.info(`[hub] blinksocks server is running at ${service}`);
        resolve(server);
      });
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
          const source = { host: address, port: port };
          const context = { conn: server, source };
          relay = this._createUdpRelay(source);
          if (this._config.is_client) {
            relay.addInboundOnClient(context, proxyRequest);
          } else {
            relay.addInboundOnServer(context);
          }
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

  _getSourceAddress(conn) {
    let sourceHost, sourcePort;
    if (conn.session) {
      sourceHost = conn.session.socket.remoteAddress;
      sourcePort = conn.session.socket.remotePort;
    } else {
      sourceHost = conn.remoteAddress;
      sourcePort = conn.remotePort;
    }
    return { host: sourceHost, port: sourcePort };
  }

  _createRelay(source) {
    const props = {
      source: source,
      config: this._config,
      transport: this._config.server_protocol,
      presets: this._config.presets
    };
    return this._config.mux ? new _muxRelay.MuxRelay(props) : new _relay.Relay(props);
  }

  _createUdpRelay(source) {
    return new _relay.Relay({ source, config: this._config, transport: 'udp', presets: this._config.udp_presets });
  }

  _updateConnStatus(event, source, extra = null) {
    const conn = this._connQueue.find(({ sourceHost, sourcePort }) => source.host === sourceHost && source.port === sourcePort);
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
            sourceHost: source.host,
            sourcePort: source.port
          });
        }
        break;
      case 'target':
        if (conn) {
          const target = extra;
          conn.stage = CONN_STAGE_TRANSFER;
          conn.targetHost = target.host;
          conn.targetPort = target.port;
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