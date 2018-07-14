'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MuxRelay = undefined;

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _lodash = require('lodash.uniqueid');

var _lodash2 = _interopRequireDefault(_lodash);

var _pipe = require('./pipe');

var _tracker = require('./tracker');

var _utils = require('../utils');

var _presets = require('../presets');

var _constants = require('../constants');

var _transports = require('../transports');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class MuxInbound extends _events2.default {

  constructor(inbound) {
    super();
    this._inbound = inbound;
    this._inbound.on('drain', () => this.emit('drain'));
  }

  get bufferSize() {
    return this._inbound.bufferSize;
  }

}

class MuxOutbound extends _events2.default {

  constructor(outbound) {
    super();
    this._outbound = outbound;
    this._outbound.on('drain', () => this.emit('drain'));
  }

  get bufferSize() {
    return this._outbound.bufferSize;
  }

}

class MuxRelay extends _events2.default {

  constructor({ config, transport, presets = [] }) {
    super();

    _initialiseProps.call(this);

    this._config = config;
    this._transport = transport;
    this._presets = this._preparePresets(presets);
  }

  async addInboundOnClient(context, proxyRequest) {
    const { _transport: transport, _config: config } = this;
    const { source, conn } = context;
    const { host, port, onConnected } = proxyRequest;
    const remote = `${source.host}:${source.port}`;
    const target = `${host}:${port}`;

    const tracker = new _tracker.Tracker({ config, transport });
    tracker.setSourceAddress(source.host, source.port);
    tracker.setTargetAddress(host, port);

    const outbounds = this._outbounds;
    let isReUse = false;
    let outbound = this._getRandomBound(outbounds);
    if (!outbound) {
      outbound = this._createMuxOutbound({ source });
      outbounds.set(outbound.__id, outbound);
      _utils.logger.info(`[mux-relay] [${remote}] create ${outbound.__id}, total=${outbounds.size}`);
    } else {
      isReUse = true;
    }

    _utils.logger.info(`[mux-relay] [${remote}] request: ${target} via ${outbound.__id}` + (isReUse ? ' [REUSE]' : ''));

    const pipe = this._pipes.get(outbound.__id);

    const cid = (0, _utils.hash)('sha256', (0, _lodash2.default)(_constants.APP_ID)).slice(-4).toString('hex');

    let isFirstFrameOut = false;

    const { Inbound } = this._getBounds(transport);
    const inbound = new Inbound({ config, source, conn });
    inbound.setOutbound(new MuxOutbound(outbound));
    inbound.on('_error', err => this.emit('_error', err));
    inbound.on('data', buffer => {
      if (!isFirstFrameOut) {
        isFirstFrameOut = true;
        pipe.feed(_constants.PIPE_ENCODE, buffer, { cid, host, port });
      } else {
        pipe.feed(_constants.PIPE_ENCODE, buffer, { cid });
      }
      tracker.trace(_constants.PIPE_ENCODE, buffer.length);
      setImmediate(() => this.emit('_write', buffer.length));
    });
    inbound.on('close', () => {
      pipe.feed(_constants.PIPE_ENCODE, Buffer.alloc(0), { cid, isClosing: true });
      outbound.__associate_inbounds.delete(cid);
      this._inbounds.delete(cid);
      tracker.destroy();
    });
    inbound.__tracker = tracker;
    this._inbounds.set(cid, inbound);

    outbound.__associate_inbounds.set(cid, inbound);

    await outbound.connect();
    try {
      if (typeof onConnected === 'function') {
        onConnected(buffer => {
          if (buffer) {
            inbound.onReceive(buffer);
          }
        });
      }
    } catch (err) {
      _utils.logger.error(`[mux-relay] [${remote}] onConnected callback error: ${err.message}`);
      this.emit('_error', err);
    }
  }

  addInboundOnServer(context) {
    const { source, conn } = context;
    const remote = `${source.host}:${source.port}`;
    const inbound = this._createMuxInbound({ source, conn });
    this._inbounds.set(inbound.__id, inbound);
    _utils.logger.info(`[mux-relay] [${remote}] create ${inbound.__id}, total=${this._inbounds.size}`);
  }

  destroy() {
    if (!this._destroyed) {
      this._destroyed = true;
      this._inbounds.forEach(bound => {
        bound.close();
        bound.removeAllListeners();
      });
      this._outbounds.forEach(bound => {
        bound.close();
        bound.removeAllListeners();
      });
      this._pipes.forEach(pipe => {
        pipe.destroy();
        pipe.removeAllListeners();
      });
      this._inbounds.clear();
      this._outbounds.clear();
      this._pipes.clear();
      this._pendingFrames.clear();
    }
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
    return { Inbound, Outbound };
  }

  _createMuxOutbound({ source }) {
    const { _transport: transport, _config: config } = this;
    const { Outbound } = this._getBounds(transport);
    const __id = (0, _lodash2.default)('mux_outbound_');

    const pipe = new _pipe.Pipe(this._getPipeProps());
    pipe.on('broadcast', action => this.onBroadcast({ action, source }));
    pipe.on(`post_${_constants.PIPE_ENCODE}`, buffer => outbound.write(buffer));
    this._pipes.set(__id, pipe);

    const outbound = new Outbound({ config, source });
    outbound.on('_error', err => this.emit('_error', err));
    outbound.on('data', buffer => pipe.feed(_constants.PIPE_DECODE, buffer));
    outbound.on('close', () => {
      _utils.logger.info(`[mux-relay] ${outbound.__id} closed, cleanup ${outbound.__associate_inbounds.size} inbounds`);
      outbound.__associate_inbounds.forEach(inbound => inbound.close());
      outbound.__associate_inbounds = null;
      this._outbounds.delete(outbound.__id);
    });
    outbound.__id = __id;
    outbound.__associate_inbounds = new Map();

    return outbound;
  }

  _createMuxInbound({ source, conn }) {
    const { _transport: transport, _config: config } = this;
    const { Inbound } = this._getBounds(transport);
    const __id = (0, _lodash2.default)('mux_inbound_');

    const pipe = new _pipe.Pipe(this._getPipeProps());
    pipe.on('broadcast', action => this.onBroadcast({ action, source }));
    pipe.on(`post_${_constants.PIPE_ENCODE}`, buffer => inbound.write(buffer));
    this._pipes.set(__id, pipe);

    const inbound = new Inbound({ config, source, conn });
    inbound.on('_error', err => this.emit('_error', err));
    inbound.on('data', buffer => {
      pipe.feed(_constants.PIPE_DECODE, buffer);
    });
    inbound.on('close', () => {
      _utils.logger.info(`[mux-relay] ${inbound.__id} closed, cleanup ${inbound.__associate_outbounds.size} outbounds`);
      inbound.__associate_outbounds.forEach(outbound => outbound.close());
      inbound.__associate_outbounds = null;
      this._inbounds.delete(inbound.__id);
      this.emit('close');
    });
    inbound.__id = __id;
    inbound.__associate_outbounds = new Map();

    return inbound;
  }

  _getRandomBound(bounds) {
    const concurrency = bounds.size;
    if (concurrency < 1) {
      return null;
    }
    if (concurrency < this._config.mux_concurrency && (0, _utils.getRandomInt)(0, 1) === 0) {
      return null;
    }
    return [...bounds.values()][(0, _utils.getRandomInt)(0, concurrency - 1)];
  }

  _getPipeProps() {
    const { _transport: transport, _config: config, _presets: presets } = this;
    return {
      config,
      presets,
      isUdp: transport === 'udp',
      injector: preset => {
        if (preset.name === 'mux') {
          preset.muxNewConn = this.onNewSubConn;
          preset.muxDataFrame = this.onDataFrame;
          preset.muxCloseConn = this.onSubConnCloseByProtocol;
        }
      }
    };
  }

  _preparePresets(presets) {
    presets = presets.filter(({ name }) => !_presets.IPresetAddressing.isPrototypeOf((0, _presets.getPresetClassByName)(name)));
    const first = presets[0];

    if (!first || first.name !== 'mux') {
      presets = [{ 'name': 'mux', 'usePrivate': true }].concat(presets);
    }
    return presets;
  }

}
exports.MuxRelay = MuxRelay;

var _initialiseProps = function () {
  this._config = null;
  this._transport = null;
  this._presets = [];
  this._inbounds = new Map();
  this._outbounds = new Map();
  this._pipes = new Map();
  this._pendingFrames = new Map();
  this._destroyed = false;

  this.onBroadcast = ({ action, source }) => {
    if (action.type === _constants.PRESET_FAILED) {
      const { name, message } = action.payload;
      const remote = `${source.host}:${source.port}`;
      _utils.logger.error(`[mux-relay] [${this._transport}] [${remote}] preset "${name}" fail to process: ${message}`);
    }
  };

  this.onNewSubConn = async ({ cid, host, port }) => {
    const { _config: config, _transport: transport } = this;
    const { Outbound } = this._getBounds(transport);

    const inbound = this._getRandomBound(this._inbounds);
    if (!inbound) {
      _utils.logger.error(`[mux-relay] cannot create outbound for cid=${cid}, because no mux inbound available`);
      return;
    }
    const { _source: source } = inbound;

    const { host: sourceHost, port: sourcePort } = source;
    const remote = `${sourceHost}:${sourcePort}`;
    const target = `${host}:${port}`;

    this.emit('_connect', { host, port });
    _utils.logger.info(`[mux-relay] [${remote}] request: ${target}`);

    const pipe = this._pipes.get(inbound.__id);

    const tracker = new _tracker.Tracker({ config, transport });
    tracker.setSourceAddress(source.host, source.port);
    tracker.setTargetAddress(host, port);

    const outbound = new Outbound({ config, source });
    outbound.setInbound(new MuxInbound(inbound));
    outbound.on('_error', err => this.emit('_error', err));
    outbound.on('data', buffer => {
      pipe.feed(_constants.PIPE_ENCODE, buffer, { cid });
      tracker.trace(_constants.PIPE_ENCODE, buffer.length);
      setImmediate(() => this.emit('_write', buffer.length));
    });
    outbound.on('close', () => {
      pipe.feed(_constants.PIPE_ENCODE, Buffer.alloc(0), { cid, isClosing: true });
      inbound.__associate_outbounds.delete(cid);
      this._outbounds.delete(cid);
      tracker.destroy();
    });
    outbound.__tracker = tracker;
    this._outbounds.set(cid, outbound);

    inbound.__associate_outbounds.set(cid, outbound);

    await outbound.connect(host, port);

    const frames = this._pendingFrames.get(cid);
    if (frames) {
      const buffer = Buffer.concat(frames);
      this._pendingFrames.delete(cid);
      outbound.write(buffer);
      outbound.__tracker.trace(_constants.PIPE_DECODE, buffer.length);
      setImmediate(() => this.emit('_read', buffer.length));
    }
  };

  this.onDataFrame = ({ cid, data }) => {
    if (this._config.is_client) {
      const inbound = this._inbounds.get(cid);
      if (inbound && inbound.writable) {
        inbound.write(data);
        inbound.__tracker.trace(_constants.PIPE_DECODE, data.length);
        setImmediate(() => this.emit('_read', data.length));
      } else {
        _utils.logger.debug(`[mux-relay] couldn't delivery data frame to cid=${cid}, dump=${(0, _utils.dumpHex)(data)}`);
      }
    } else {
      const outbound = this._outbounds.get(cid);
      if (outbound && outbound.writable) {
        outbound.write(data);
        outbound.__tracker.trace(_constants.PIPE_DECODE, data.length);
        setImmediate(() => this.emit('_read', data.length));
      } else {
        const frames = this._pendingFrames.get(cid);
        if (!frames) {
          this._pendingFrames.set(cid, [data]);
        } else {
          frames.push(data);
        }
      }
    }
  };

  this.onSubConnCloseByProtocol = ({ cid }) => {
    const bounds = this._config.is_client ? this._inbounds : this._outbounds;
    const bound = bounds.get(cid);
    if (bound) {
      bound.close();
      bounds.delete(cid);
    }
  };
};