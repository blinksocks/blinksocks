import EventEmitter from 'events';
import uniqueId from 'lodash.uniqueid';
import { Pipe } from './pipe';
import { Tracker } from './tracker';
import { hash, logger, getRandomInt } from '../utils';
import { getPresetClassByName } from '../presets';
import { IPresetAddressing } from '../presets/defs';

import {
  MUX_CLOSE_CONN,
  MUX_DATA_FRAME,
  MUX_NEW_CONN,
  PIPE_DECODE,
  PIPE_ENCODE,
  APP_ID, PRESET_FAILED,
} from '../constants';

import {
  TcpInbound, TcpOutbound,
  UdpInbound, UdpOutbound,
  TlsInbound, TlsOutbound,
  Http2Inbound, Http2Outbound,
  WsInbound, WsOutbound,
  WssInbound, WssOutbound,
} from '../transports';

// .on('_connect')
// .on('_read')
// .on('_write')
// .on('_error')
// .on('close')
export class MuxRelay extends EventEmitter {

  _config = null;

  _transport = null;

  _presets = [];

  _inbounds = new Map();

  _outbounds = new Map();

  _pipes = new Map();

  _pendingFrames = new Map();

  _destroyed = false;

  constructor({ config, transport, presets = [] }) {
    super();
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

    // tracker
    const tracker = new Tracker({ config, transport });
    tracker.setSourceAddress(source.host, source.port);
    tracker.setTargetAddress(host, port);

    // outbound, create if needed
    const outbounds = this._outbounds;
    let isReUse = false;
    let outbound = this._getRandomBound(outbounds);
    if (!outbound) {
      outbound = this._createMuxOutbound({ source });
      outbounds.set(outbound.__id, outbound);
      logger.info(`[mux-relay] [${remote}] create a new mux outbound(id=${outbound.__id}), total=${outbounds.size}`);
    } else {
      isReUse = true;
    }

    this.emit('_connect', { host, port });
    logger.info(`[mux-relay] [${remote}] request: ${target} via mux outbound(id=${outbound.__id})` + (isReUse ? ' [REUSE]' : ''));

    // pipe
    const pipe = this._pipes.get(outbound.__id);

    // generate a random cid in hex, do this only on client side
    const cid = hash('sha256', uniqueId(APP_ID)).slice(-4).toString('hex');

    // inbound
    let isFirstFrameOut = false;

    const { Inbound } = this._getBounds(transport);
    const inbound = new Inbound({ config, source, conn });
    inbound.on('_error', (err) => this.emit('_error', err));
    inbound.on('data', (buffer) => {
      if (!isFirstFrameOut) {
        isFirstFrameOut = true;
        pipe.feed(PIPE_ENCODE, buffer, { cid, host, port });
      } else {
        pipe.feed(PIPE_ENCODE, buffer, { cid });
      }
      tracker.trace(PIPE_ENCODE, buffer.length);
      setImmediate(() => this.emit('_write', buffer.length));
    });
    inbound.on('close', () => {
      // inform remote to close associate outbound
      pipe.feed(PIPE_ENCODE, Buffer.alloc(0), { cid, isClosing: true });
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
        onConnected((buffer) => {
          if (buffer) {
            inbound.onReceive(buffer);
          }
        });
      }
    } catch (err) {
      logger.error(`[mux-relay] [${remote}] onConnected callback error: ${err.message}`);
      this.emit('_error', err);
    }
  }

  addInboundOnServer(context) {
    const { source, conn } = context;
    const remote = `${source.host}:${source.port}`;
    const inbound = this._createMuxInbound({ source, conn });
    this._inbounds.set(inbound.__id, inbound);
    logger.info(`[mux-relay] [${remote}] create a new mux inbound(id=${inbound.__id}), total=${this._inbounds.size}`);
  }

  destroy() {
    if (!this._destroyed) {
      this._destroyed = true;
      this._inbounds.forEach((bound) => {
        bound.close();
        bound.removeAllListeners();
      });
      this._outbounds.forEach((bound) => {
        bound.close();
        bound.removeAllListeners();
      });
      this._pipes.forEach((pipe) => {
        pipe.destroy();
        pipe.removeAllListeners();
      });
      this._inbounds.clear();
      this._outbounds.clear();
      this._pipes.clear();
      this._pendingFrames.clear();
    }
  }

  // events

  onBroadcast = ({ action, source }) => {
    if (action.type === MUX_NEW_CONN) {
      return this.onNewSubConn(action.payload);
    }
    else if (action.type === MUX_DATA_FRAME) {
      return this.onDataFrame(action.payload);
    }
    else if (action.type === MUX_CLOSE_CONN) {
      return this.onSubConnCloseByProtocol(action.payload);
    }
    else if (action.type === PRESET_FAILED) {
      const { name, message } = action.payload;
      const remote = `${source.host}:${source.port}`;
      logger.error(`[mux-relay] [${this._transport}] [${remote}] preset "${name}" fail to process: ${message}`);
    }
  };

  async onNewSubConn({ cid, host, port }) {
    const { _config: config, _transport: transport } = this;
    const { Outbound } = this._getBounds(transport);

    // select a inbound
    const inbound = this._getRandomBound(this._inbounds);
    if (!inbound) {
      logger.error(`[mux-relay] cannot create outbound for cid=${cid}, because no mux inbound available`);
      return;
    }
    const { _source: source } = inbound;

    const { host: sourceHost, port: sourcePort } = source;
    const remote = `${sourceHost}:${sourcePort}`;
    const target = `${host}:${port}`;

    this.emit('_connect', { host, port });
    logger.info(`[mux-relay] [${remote}] request: ${target}`);

    // pipe
    const pipe = this._pipes.get(inbound.__id);

    // tracker
    const tracker = new Tracker({ config, transport });
    tracker.setSourceAddress(source.host, source.port);
    tracker.setTargetAddress(host, port);

    // outbound
    const outbound = new Outbound({ config, source });
    outbound.on('_error', (err) => this.emit('_error', err));
    outbound.on('data', (buffer) => {
      pipe.feed(PIPE_ENCODE, buffer, { cid });
      tracker.trace(PIPE_ENCODE, buffer.length);
      setImmediate(() => this.emit('_write', buffer.length));
    });
    outbound.on('close', () => {
      // inform remote to close associate inbound
      pipe.feed(PIPE_ENCODE, Buffer.alloc(0), { cid, isClosing: true });
      inbound.__associate_outbounds.delete(cid);
      this._outbounds.delete(cid);
      tracker.destroy();
    });
    outbound.__tracker = tracker;
    this._outbounds.set(cid, outbound);

    inbound.__associate_outbounds.set(cid, outbound);

    await outbound.connect(host, port);

    // once connect, flush all pending frames
    const frames = this._pendingFrames.get(cid);
    if (frames) {
      const buffer = Buffer.concat(frames);
      this._pendingFrames.delete(cid);
      outbound.write(buffer);
      outbound.__tracker.trace(PIPE_DECODE, buffer.length);
      setImmediate(() => this.emit('_read', buffer.length));
    }
  }

  onDataFrame({ cid, data }) {
    if (this._config.is_client) {
      const inbound = this._inbounds.get(cid);
      inbound.write(data);
      inbound.__tracker.trace(PIPE_DECODE, data.length);
      setImmediate(() => this.emit('_read', data.length));
    } else {
      const outbound = this._outbounds.get(cid);
      if (outbound && outbound.writable) {
        outbound.write(data);
        outbound.__tracker.trace(PIPE_DECODE, data.length);
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
  }

  onSubConnCloseByProtocol({ cid }) {
    const bounds = this._config.is_client ? this._inbounds : this._outbounds;
    const bound = bounds.get(cid);
    if (bound) {
      bound.close();
      bounds.delete(cid);
    }
  }

  // methods

  _getBounds(transport) {
    const mapping = {
      'tcp': [TcpInbound, TcpOutbound],
      'udp': [UdpInbound, UdpOutbound],
      'tls': [TlsInbound, TlsOutbound],
      'h2': [Http2Inbound, Http2Outbound],
      'ws': [WsInbound, WsOutbound],
      'wss': [WssInbound, WssOutbound],
    };
    let Inbound = null, Outbound = null;
    if (transport === 'udp') {
      [Inbound, Outbound] = [UdpInbound, UdpOutbound];
    } else {
      [Inbound, Outbound] = this._config.is_client ? [TcpInbound, mapping[transport][1]] : [mapping[transport][0], TcpOutbound];
    }
    return { Inbound, Outbound };
  }

  // client only
  _createMuxOutbound({ source }) {
    const { _transport: transport, _config: config, _presets: presets } = this;
    const { Outbound } = this._getBounds(transport);
    const __id = uniqueId('mux_outbound_');

    // pipe
    const pipe = new Pipe({ config, presets, isUdp: transport === 'udp' });
    pipe.on('broadcast', (action) => this.onBroadcast({ action, source }));
    pipe.on(`post_${PIPE_ENCODE}`, (buffer) => outbound.write(buffer));
    this._pipes.set(__id, pipe);

    // outbound
    const outbound = new Outbound({ config, source });
    outbound.on('_error', (err) => this.emit('_error', err));
    outbound.on('data', (buffer) => pipe.feed(PIPE_DECODE, buffer));
    outbound.on('close', () => {
      logger.info(`[mux-relay] mux outbound(id=${outbound.__id}) closed, cleanup ${outbound.__associate_inbounds.size} inbounds`);
      outbound.__associate_inbounds.forEach((inbound) => inbound.close());
      outbound.__associate_inbounds = null;
      this._outbounds.delete(outbound.__id);
    });
    outbound.__id = __id;
    outbound.__associate_inbounds = new Map();

    return outbound;
  }

  // server only
  _createMuxInbound({ source, conn }) {
    const { _transport: transport, _config: config, _presets: presets } = this;
    const { Inbound } = this._getBounds(transport);
    const __id = uniqueId('mux_inbound_');

    // pipe
    const pipe = new Pipe({ config, presets, isUdp: transport === 'udp' });
    pipe.on('broadcast', (action) => this.onBroadcast({ action, source }));
    pipe.on(`post_${PIPE_ENCODE}`, (buffer) => inbound.write(buffer));
    this._pipes.set(__id, pipe);

    // inbound
    const inbound = new Inbound({ config, source, conn });
    inbound.on('_error', (err) => this.emit('_error', err));
    inbound.on('data', (buffer) => {
      pipe.feed(PIPE_DECODE, buffer);
    });
    inbound.on('close', () => {
      logger.info(`[mux-relay] mux inbound(id=${inbound.__id}) closed, cleanup ${inbound.__associate_outbounds.size} outbounds`);
      inbound.__associate_outbounds.forEach((outbound) => outbound.close());
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
    if (concurrency < this._config.mux_concurrency && getRandomInt(0, 1) === 0) {
      return null;
    }
    return [...bounds.values()][getRandomInt(0, concurrency - 1)];
  }

  _preparePresets(presets) {
    // remove unnecessary presets
    presets = presets.filter(
      ({ name }) => !IPresetAddressing.isPrototypeOf(getPresetClassByName(name)),
    );
    const first = presets[0];
    // prepend "mux" preset on the top
    if (!first || first.name !== 'mux') {
      presets = [{ 'name': 'mux', 'usePrivate': true }].concat(presets);
    }
    return presets;
  }

}
