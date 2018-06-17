'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Relay = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _acl = require('./acl');

var _pipe = require('./pipe');

var _tracker = require('./tracker');

var _utils = require('../utils');

var _transports = require('../transports');

var _constants = require('../constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Relay extends _events2.default {

  get id() {
    return this._id;
  }

  set id(id) {
    this._id = id;
    this._ctx.cid = id;
  }

  get destroyed() {
    return this._destroyed;
  }

  constructor({ config, transport, context, presets = [] }) {
    super();
    this._id = null;
    this._config = null;
    this._acl = null;
    this._tracker = null;
    this._ctx = null;
    this._transport = null;
    this._sourceAddress = null;
    this._proxyRequest = null;
    this._inbound = null;
    this._outbound = null;
    this._pipe = null;
    this._presets = [];
    this._destroyed = false;

    this.onPreDecode = (buffer, cb) => {
      if (this._tracker !== null) {
        this._tracker.trace(_constants.PIPE_DECODE, buffer.length);
      }
      if (this._config.is_server) {
        if (this._acl) {
          this._acl.collect(_constants.PIPE_DECODE, buffer.length);
        }
      }
      cb(buffer);
      setImmediate(() => this.emit('_read', buffer.length));
    };

    this.onEncoded = buffer => {
      if (this._tracker !== null) {
        this._tracker.trace(_constants.PIPE_ENCODE, buffer.length);
      }
      if (this._config.is_client) {
        this._outbound.write(buffer);
      } else {
        if (this._acl !== null) {
          this._acl.collect(_constants.PIPE_ENCODE, buffer.length);
        }
        this._inbound.write(buffer);
      }
      setImmediate(() => this.emit('_write', buffer.length));
    };

    this.onDecoded = buffer => {
      if (this._config.is_client) {
        this._inbound.write(buffer);
      } else {
        this._outbound.write(buffer);
      }
    };

    this._id = Relay.idcounter++;
    this._config = config;
    this._transport = transport;
    this._sourceAddress = context.sourceAddress;

    this._presets = this.preparePresets(presets);
    this._pipe = this.createPipe(this._presets);

    this._ctx = _extends({
      relay: this,
      pipe: this._pipe,
      rawPresets: presets
    }, context);

    const { Inbound, Outbound } = this.getBounds(transport);
    const props = { config, context: this._ctx };
    const inbound = new Inbound(props);
    const outbound = new Outbound(props);
    this._inbound = inbound;
    this._outbound = outbound;

    this._outbound.setInbound(this._inbound);
    this._outbound.on('_error', err => this.emit('_error', err));
    this._outbound.on('close', () => this.onBoundClose(outbound, inbound));

    this._inbound.setOutbound(this._outbound);
    this._inbound.on('_error', err => this.emit('_error', err));
    this._inbound.on('close', () => this.onBoundClose(inbound, outbound));

    if (config.acl) {
      this._acl = new _acl.ACL({ sourceAddress: this._sourceAddress, rules: config.acl_rules });
      this._acl.on('action', this.onBroadcast.bind(this));
    }

    this._tracker = new _tracker.Tracker({ config, transport });
    this._tracker.setSourceAddress(this._sourceAddress.host, this._sourceAddress.port);
  }

  init({ proxyRequest }) {
    if (proxyRequest) {
      this._proxyRequest = proxyRequest;
      this._pipe.initTargetAddress(proxyRequest);
      this.onBroadcast({ type: _constants.CONNECT_TO_REMOTE, payload: proxyRequest });
    }
  }

  getBounds(transport) {
    const mapping = {
      'tcp': [_transports.TcpInbound, _transports.TcpOutbound],
      'udp': [_transports.UdpInbound, _transports.UdpOutbound],
      'tls': [_transports.TlsInbound, _transports.TlsOutbound],
      'h2': [_transports.Http2Inbound, _transports.Http2Outbound],
      'ws': [_transports.WsInbound, _transports.WsOutbound],
      'wss': [_transports.WssInbound, _transports.WssOutbound],
      'mux': [_transports.MuxInbound, _transports.MuxOutbound]
    };
    let Inbound = null,
        Outbound = null;
    if (transport === 'udp') {
      [Inbound, Outbound] = [_transports.UdpInbound, _transports.UdpOutbound];
    } else {
      [Inbound, Outbound] = this._config.is_client ? [_transports.TcpInbound, mapping[transport][1]] : [mapping[transport][0], _transports.TcpOutbound];
    }
    return { Inbound, Outbound };
  }

  onBoundClose(thisBound, anotherBound) {
    if (anotherBound.__closed) {
      this.destroy();
      this.emit('close');
    } else {
      thisBound.__closed = true;
    }
  }

  getOutbound() {
    return this._outbound;
  }

  getInbound() {
    return this._inbound;
  }

  onBroadcast(action) {
    if (action.type === _constants.CONNECT_TO_REMOTE) {
      const { host: sourceHost, port: sourcePort } = this._sourceAddress;
      const { host: targetHost, port: targetPort } = action.payload;
      const remote = `${sourceHost}:${sourcePort}`;
      const target = `${targetHost}:${targetPort}`;
      this.emit('_connect', action.payload);

      if (this._tracker) {
        this._tracker.setTargetAddress(targetHost, targetPort);
      }

      if (this._acl && this._acl.setTargetAddress(targetHost, targetPort)) {
        return;
      }

      if (this._config.mux && this._config.is_client && this._transport !== 'udp') {
        _utils.logger.info(`[relay-${this.id}] [${remote}] request over mux-${this._ctx.muxRelay.id}: ${target}`);
        return;
      }
      _utils.logger.info(`[relay] [${remote}] request: ${target}`);
    }
    if (action.type === _constants.PRESET_FAILED) {
      if (this._acl && this._acl.checkFailTimes(this._config.acl_tries)) {
        return;
      }
      this.onPresetFailed(action);
      return;
    }
    if (action.type === _acl.ACL_CLOSE_CONNECTION) {
      const transport = this._transport;
      const remote = `${this._sourceAddress.host}:${this._sourceAddress.port}`;
      _utils.logger.warn(`[relay] [${transport}] [${remote}] acl request to close this connection`);
      this.destroy();
      return;
    }
    this._inbound && this._inbound.onBroadcast(action);
    this._outbound && this._outbound.onBroadcast(action);
  }

  async onPresetFailed(action) {
    const { name, message, orgData } = action.payload;
    const transport = this._transport;
    const remote = `${this._sourceAddress.host}:${this._sourceAddress.port}`;

    _utils.logger.error(`[relay] [${transport}] [${remote}] preset "${name}" fail to process: ${message}`);
    this.emit('_error', new Error(message));

    if (this._config.is_client) {
      _utils.logger.warn(`[relay] [${transport}] [${remote}] connection closed`);
      this.destroy();
    }

    if (this._config.is_server && !this._config.mux) {
      if (this._config.redirect) {
        const [host, port] = this._config.redirect.split(':');

        _utils.logger.warn(`[relay] [${transport}] [${remote}] connection is redirecting to: ${host}:${port}`);

        this._pipe.updatePresets([]);

        await this._outbound.connect({ host, port: +port });
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

  encode(buffer, extraArgs) {
    if (this._pipe) {
      this._pipe.feed(_constants.PIPE_ENCODE, buffer, extraArgs);
    }
  }

  decode(buffer, extraArgs) {
    if (this._pipe) {
      this._pipe.feed(_constants.PIPE_DECODE, buffer, extraArgs);
    }
  }

  isOutboundReady() {
    return this._outbound && this._outbound.writable;
  }

  preparePresets(presets) {
    return presets;
  }

  createPipe(presets) {
    const pipe = new _pipe.Pipe({ config: this._config, presets, isUdp: this._transport === 'udp' });
    pipe.on('broadcast', this.onBroadcast.bind(this));
    pipe.on(`pre_${_constants.PIPE_DECODE}`, this.onPreDecode);
    pipe.on(`post_${_constants.PIPE_ENCODE}`, this.onEncoded);
    pipe.on(`post_${_constants.PIPE_DECODE}`, this.onDecoded);
    return pipe;
  }

  destroy() {
    if (!this._destroyed) {
      this._destroyed = true;
      if (this._pipe) {
        this._pipe.destroy();
        this._pipe.removeAllListeners();
        this._pipe = null;
        this._presets = null;
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
      this._ctx = null;
      this._sourceAddress = null;
      this._proxyRequest = null;
    }
  }

}
exports.Relay = Relay;
Relay.idcounter = 0;