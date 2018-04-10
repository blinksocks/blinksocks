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

var _constants = require('../constants');

var _transports = require('../transports');

var _actions = require('../presets/actions');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Relay extends _events2.default {

  get id() {
    return this._id;
  }

  set id(id) {
    this._id = id;
    this._ctx.cid = id;
  }

  constructor({ config, transport, context, presets = [] }) {
    super();
    this._id = null;
    this._config = null;
    this._acl = null;
    this._tracker = null;
    this._ctx = null;
    this._transport = null;
    this._remoteInfo = null;
    this._proxyRequest = null;
    this._inbound = null;
    this._outbound = null;
    this._pipe = null;
    this._presets = [];
    this._destroyed = false;

    this.onChangePresetSuite = action => {
      const { type, suite, data } = action.payload;
      _utils.logger.verbose(`[relay] changing presets suite to: ${JSON.stringify(suite)}`);

      this.updatePresets(this.preparePresets([...suite.presets, { 'name': 'auto-conf' }]));

      const proxyRequest = this._proxyRequest;
      if (this._config.is_client) {
        this._pipe.broadcast(null, {
          type: _actions.CONNECT_TO_REMOTE,
          payload: _extends({}, proxyRequest, { keepAlive: true }) });
      }

      this._pipe.feed(type, data);
    };

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

    this.updatePresets = value => {
      this._presets = typeof value === 'function' ? value(this._presets) : value;
      this._pipe.updatePresets(this._presets);
    };

    this._id = Relay.idcounter++;
    this._config = config;
    this._transport = transport;
    this._remoteInfo = context.remoteInfo;

    this._presets = this.preparePresets(presets);
    this._pipe = this.createPipe(this._presets);

    this._ctx = _extends({
      pipe: this._pipe,
      rawPresets: presets,
      thisRelay: this
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
    this._outbound.on('updatePresets', this.updatePresets);

    this._inbound.setOutbound(this._outbound);
    this._inbound.on('_error', err => this.emit('_error', err));
    this._inbound.on('close', () => this.onBoundClose(inbound, outbound));
    this._inbound.on('updatePresets', this.updatePresets);

    if (config.acl) {
      this._acl = new _acl.ACL({ remoteInfo: this._remoteInfo, rules: config.acl_rules });
      this._acl.on('action', this.onBroadcast.bind(this));
    }

    this._tracker = new _tracker.Tracker({ config, transport });
    this._tracker.setSourceAddress(this._remoteInfo.host, this._remoteInfo.port);
  }

  init({ proxyRequest }) {
    this._proxyRequest = proxyRequest;
    if (proxyRequest) {
      this._pipe.broadcast(null, { type: _actions.CONNECT_TO_REMOTE, payload: proxyRequest });
    }
  }

  getBounds(transport) {
    const mapping = {
      'tcp': [_transports.TcpInbound, _transports.TcpOutbound],
      'udp': [_transports.UdpInbound, _transports.UdpOutbound],
      'tls': [_transports.TlsInbound, _transports.TlsOutbound],
      'ws': [_transports.WsInbound, _transports.WsOutbound],
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
      if (this._pipe && !this._pipe.destroyed) {
        this._pipe.broadcast('pipe', { type: _actions.CONNECTION_CLOSED, payload: this._remoteInfo });
      }
      this.destroy();
      this.emit('close');
    } else {
      if (this._pipe && !this._pipe.destroyed) {
        this._pipe.broadcast('pipe', { type: _actions.CONNECTION_WILL_CLOSE, payload: this._remoteInfo });
      }
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
    if (action.type === _actions.CONNECT_TO_REMOTE) {
      const { host: sourceHost, port: sourcePort } = this._remoteInfo;
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
    if (action.type === _actions.PRESET_FAILED) {
      if (this._acl && this._acl.checkFailTimes(this._config.acl_tries)) {
        return;
      }
    }
    if (action.type === _actions.CHANGE_PRESET_SUITE) {
      this.onChangePresetSuite(action);
      return;
    }
    this._inbound && this._inbound.onBroadcast(action);
    this._outbound && this._outbound.onBroadcast(action);
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
      this._remoteInfo = null;
      this._proxyRequest = null;
    }
  }

}
exports.Relay = Relay;
Relay.idcounter = 0;