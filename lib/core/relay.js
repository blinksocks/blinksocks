"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Relay = void 0;

var _events = _interopRequireDefault(require("events"));

var _acl = require("./acl");

var _pipe = require("./pipe");

var _tracker = require("./tracker");

var _utils = require("../utils");

var _transports = require("../transports");

var _constants = require("../constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class Relay extends _events.default {
  get destroyed() {
    return this._destroyed;
  }

  constructor({
    config,
    source: _source,
    transport: _transport,
    presets = []
  }) {
    super();

    _defineProperty(this, "_config", null);

    _defineProperty(this, "_acl", null);

    _defineProperty(this, "_tracker", null);

    _defineProperty(this, "_source", null);

    _defineProperty(this, "_transport", null);

    _defineProperty(this, "_inbound", null);

    _defineProperty(this, "_outbound", null);

    _defineProperty(this, "_pipe", null);

    _defineProperty(this, "_destroyed", false);

    _defineProperty(this, "onInboundReceive", buffer => {
      const direction = this._config.is_client ? _constants.PIPE_ENCODE : _constants.PIPE_DECODE;

      this._pipe.feed(direction, buffer);
    });

    _defineProperty(this, "onOutboundReceive", buffer => {
      const direction = this._config.is_client ? _constants.PIPE_DECODE : _constants.PIPE_ENCODE;

      this._pipe.feed(direction, buffer);
    });

    _defineProperty(this, "onBroadcast", action => {
      if (action.type === _constants.CONNECT_TO_REMOTE) {
        return this.onConnectToRemove(action);
      }

      if (action.type === _constants.PRESET_FAILED) {
        if (this._acl && this._acl.checkFailTimes(this._config.acl_tries)) {
          return;
        }

        return this.onPresetFailed(action);
      }

      if (action.type === _acl.ACL_CLOSE_CONNECTION) {
        const source = this._source;
        const transport = this._transport;
        const remote = `${source.host}:${source.port}`;

        _utils.logger.warn(`[relay] [${transport}] [${remote}] acl request to close this connection`);

        this.destroy();
        return;
      }

      this._inbound && this._inbound.onBroadcast(action);
      this._outbound && this._outbound.onBroadcast(action);
    });

    _defineProperty(this, "onPreDecode", (buffer, cb) => {
      this._tracker.trace(_constants.PIPE_DECODE, buffer.length);

      if (this._acl) {
        this._acl.collect(_constants.PIPE_DECODE, buffer.length);
      }

      cb(buffer);
      setImmediate(() => this.emit('_read', buffer.length));
    });

    _defineProperty(this, "onEncoded", buffer => {
      this._tracker.trace(_constants.PIPE_ENCODE, buffer.length);

      if (this._config.is_client) {
        this._outbound.write(buffer);
      } else {
        if (this._acl) {
          this._acl.collect(_constants.PIPE_ENCODE, buffer.length);
        }

        this._inbound.write(buffer);
      }

      setImmediate(() => this.emit('_write', buffer.length));
    });

    _defineProperty(this, "onDecoded", buffer => {
      if (this._config.is_client) {
        this._inbound.write(buffer);
      } else {
        this._outbound.write(buffer);
      }
    });

    this._config = config;
    this._transport = _transport;
    this._source = _source;
    this._pipe = new _pipe.Pipe({
      config,
      presets,
      isUdp: _transport === 'udp'
    });

    this._pipe.on('broadcast', this.onBroadcast);

    this._pipe.on(`pre_${_constants.PIPE_DECODE}`, this.onPreDecode);

    this._pipe.on(`post_${_constants.PIPE_ENCODE}`, this.onEncoded);

    this._pipe.on(`post_${_constants.PIPE_DECODE}`, this.onDecoded);

    if (config.is_server && config.acl) {
      this._acl = new _acl.ACL({
        sourceAddress: this._source,
        rules: config.acl_rules
      });

      this._acl.on('action', this.onBroadcast);
    }

    this._tracker = new _tracker.Tracker({
      config,
      transport: _transport
    });

    this._tracker.setSourceAddress(this._source.host, this._source.port);
  }

  async addInboundOnClient(context, proxyRequest) {
    const {
      source
    } = context;
    const {
      host,
      port,
      onConnected
    } = proxyRequest;
    const remote = `${source.host}:${source.port}`;
    const target = `${host}:${port}`;

    this._init(context);

    this._pipe.initTargetAddress({
      host,
      port
    });

    this._tracker.setTargetAddress(host, port);

    _utils.logger.info(`[relay] [${remote}] request: ${target}`);

    await this._outbound.connect();

    try {
      if (typeof onConnected === 'function') {
        onConnected(buffer => {
          if (buffer) {
            this._inbound.onReceive(buffer);
          }
        });
      }
    } catch (err) {
      _utils.logger.error(`[relay] [${remote}] onConnected callback error: ${err.message}`);

      this.emit('_error', err);
    }
  }

  addInboundOnServer(context) {
    this._init(context);
  }

  _init(context) {
    const {
      Inbound,
      Outbound
    } = this._getBounds(this._transport);

    const props = {
      config: this._config,
      source: context.source,
      conn: context.conn
    };
    const inbound = new Inbound(props);
    const outbound = new Outbound(props);
    this._inbound = inbound;
    this._outbound = outbound;

    this._outbound.setInbound(this._inbound);

    this._outbound.on('_error', err => this.emit('_error', err));

    this._outbound.on('data', this.onOutboundReceive);

    this._outbound.on('close', () => this.onBoundClose(outbound, inbound));

    this._inbound.setOutbound(this._outbound);

    this._inbound.on('_error', err => this.emit('_error', err));

    this._inbound.on('data', this.onInboundReceive);

    this._inbound.on('close', () => this.onBoundClose(inbound, outbound));
  }

  _getBounds(transport) {
    const mapping = {
      'tcp': [_transports.TcpInbound, _transports.TcpOutbound],
      'udp': [_transports.UdpInbound, _transports.UdpOutbound],
      'tls': [_transports.TlsInbound, _transports.TlsOutbound],
      'h2': [_transports.Http2Inbound, _transports.Http2Outbound],
      'ws': [_transports.WsInbound, _transports.WsOutbound],
      'wss': [_transports.WssInbound, _transports.WssOutbound]
    };
    let Inbound = null,
        Outbound = null;

    if (transport === 'udp') {
      [Inbound, Outbound] = [_transports.UdpInbound, _transports.UdpOutbound];
    } else {
      [Inbound, Outbound] = this._config.is_client ? [_transports.TcpInbound, mapping[transport][1]] : [mapping[transport][0], _transports.TcpOutbound];
    }

    return {
      Inbound,
      Outbound
    };
  }

  onBoundClose(thisBound, anotherBound) {
    if (anotherBound.__closed) {
      this.destroy();
      this.emit('close');
    } else {
      thisBound.__closed = true;
    }
  }

  async onConnectToRemove(action) {
    const {
      host: sourceHost,
      port: sourcePort
    } = this._source;
    const {
      host,
      port,
      onConnected
    } = action.payload;
    const remote = `${sourceHost}:${sourcePort}`;
    const target = `${host}:${port}`;
    this.emit('_connect', action.payload);

    this._tracker.setTargetAddress(host, port);

    if (this._acl && this._acl.setTargetAddress(host, port)) {
      return;
    }

    _utils.logger.info(`[relay] [${remote}] request: ${target}`);

    if (this._config.is_server) {
      await this._outbound.connect(host, port);

      if (typeof onConnected === 'function') {
        onConnected();
      }
    }
  }

  async onPresetFailed(action) {
    const {
      name,
      message,
      orgData
    } = action.payload;
    const source = this._source;
    const transport = this._transport;
    const remote = `${source.host}:${source.port}`;

    _utils.logger.error(`[relay] [${transport}] [${remote}] preset "${name}" fail to process: ${message}`);

    this.emit('_error', new Error(message));

    if (this._config.is_client) {
      _utils.logger.warn(`[relay] [${transport}] [${remote}] connection closed`);

      this.destroy();
    }

    if (this._config.is_server) {
      if (this._config.redirect) {
        const [host, port] = this._config.redirect.split(':');

        _utils.logger.warn(`[relay] [${transport}] [${remote}] connection is redirecting to: ${host}:${port}`);

        this._pipe.updatePresets([]);

        await this._outbound.connect(host, port, true);

        if (this._outbound.writable) {
          this._outbound.write(orgData);
        }
      } else {
        this._outbound.pause && this._outbound.pause();
        const timeout = (0, _utils.getRandomInt)(5, 30);

        _utils.logger.warn(`[relay] [${transport}] [${remote}] connection will be closed in ${timeout}s...`);

        setTimeout(this.destroy.bind(this), timeout * 1e3);
      }
    }
  }

  destroy() {
    if (!this._destroyed) {
      this._destroyed = true;

      if (this._pipe) {
        this._pipe.destroy();

        this._pipe.removeAllListeners();

        this._pipe = null;
      }

      if (this._inbound) {
        this._inbound.close();

        this._inbound.removeAllListeners();

        this._inbound = null;
      }

      if (this._outbound) {
        this._outbound.close();

        this._outbound.removeAllListeners();

        this._outbound = null;
      }

      if (this._tracker) {
        this._tracker.destroy();

        this._tracker = null;
      }

      if (this._acl) {
        this._acl.destroy();

        this._acl = null;
      }
    }
  }

}

exports.Relay = Relay;