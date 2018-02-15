import EventEmitter from 'events';
import {Pipe} from './pipe';
import {PIPE_ENCODE, PIPE_DECODE} from '../constants';
import {logger} from '../utils';

import {
  TcpInbound, TcpOutbound,
  UdpInbound, UdpOutbound,
  TlsInbound, TlsOutbound,
  WsInbound, WsOutbound,
  MuxInbound, MuxOutbound,
} from '../transports';

import {
  CONNECT_TO_REMOTE,
  CONNECTION_CREATED,
  CONNECTION_CLOSED,
  CONNECTION_WILL_CLOSE,
  CHANGE_PRESET_SUITE,
} from '../presets/defs';

/**
 * [client side]
 * app <==> (TcpInbound) relay (MuxOutbound)
 *     <==> (MuxInbound) muxRelay (TcpOutbound, ...) <--->
 *
 * [server side]
 *     <---> (TcpInbound, ...) muxRelay (MuxOutbound) <==>
 *           (MuxInbound) relay (TcpOutbound) <==> app
 */

// .on('close')
export class Relay extends EventEmitter {

  static idcounter = 0;

  _id = null;

  _ctx = null;

  _transport = null;

  _remoteInfo = null;

  _proxyRequest = null;

  _inbound = null;

  _outbound = null;

  _pipe = null;

  _presets = [];

  _destroyed = false;

  _config = null;

  get id() {
    return this._id;
  }

  set id(id) {
    this._id = id;
    this._ctx.cid = id;
  }

  constructor({config, transport, context, presets = []}) {
    super();
    this.updatePresets = this.updatePresets.bind(this);
    this.onBroadcast = this.onBroadcast.bind(this);
    this.onEncoded = this.onEncoded.bind(this);
    this.onDecoded = this.onDecoded.bind(this);
    this._id = Relay.idcounter++;
    this._config = config;
    this._transport = transport;
    this._remoteInfo = context.remoteInfo;
    // pipe
    this._presets = this.preparePresets(presets);
    this._pipe = this.createPipe(this._presets);
    this._ctx = {
      pipe: this._pipe,
      thisRelay: this,
      ...context,
    };
    // bounds
    const {Inbound, Outbound} = this.getBounds(transport);
    const props = {config, context: this._ctx};
    const inbound = new Inbound(props);
    const outbound = new Outbound(props);
    this._inbound = inbound;
    this._outbound = outbound;
    // outbound
    this._outbound.setInbound(this._inbound);
    this._outbound.on('close', () => this.onBoundClose(outbound, inbound));
    this._outbound.on('updatePresets', this.updatePresets);
    // inbound
    this._inbound.setOutbound(this._outbound);
    this._inbound.on('close', () => this.onBoundClose(inbound, outbound));
    this._inbound.on('updatePresets', this.updatePresets);
  }

  init({proxyRequest}) {
    this._proxyRequest = proxyRequest;
    this._pipe.broadcast('pipe', {
      type: CONNECTION_CREATED,
      payload: {transport: this._transport, ...this._remoteInfo}
    });
    if (proxyRequest) {
      this._pipe.broadcast(null, {
        type: CONNECT_TO_REMOTE,
        payload: proxyRequest
      });
    }
  }

  /**
   * get Inbound and Outbound classes by transport
   * @param transport
   * @returns {{Inbound: *, Outbound: *}}
   */
  getBounds(transport) {
    const mapping = {
      'tcp': [TcpInbound, TcpOutbound],
      'udp': [UdpInbound, UdpOutbound],
      'tls': [TlsInbound, TlsOutbound],
      'ws': [WsInbound, WsOutbound],
      'mux': [MuxInbound, MuxOutbound],
    };
    let Inbound = null, Outbound = null;
    if (transport === 'udp') {
      [Inbound, Outbound] = [UdpInbound, UdpOutbound];
    } else {
      [Inbound, Outbound] = this._config.is_client ? [TcpInbound, mapping[transport][1]] : [mapping[transport][0], TcpOutbound];
    }
    return {Inbound, Outbound};
  }

  onBoundClose(thisBound, anotherBound) {
    if (anotherBound.__closed) {
      if (this._pipe && !this._pipe.destroyed) {
        this._pipe.broadcast('pipe', {type: CONNECTION_CLOSED, payload: this._remoteInfo});
      }
      this.destroy();
      this.emit('close');
    } else {
      if (!this._pipe.destroyed) {
        this._pipe.broadcast('pipe', {type: CONNECTION_WILL_CLOSE, payload: this._remoteInfo});
      }
      thisBound.__closed = true;
    }
  }

  // getters

  getOutbound() {
    return this._outbound;
  }

  getInbound() {
    return this._inbound;
  }

  // hooks of pipe

  onBroadcast(action) {
    const type = action.type;
    if (type === CONNECT_TO_REMOTE) {
      const remote = `${this._remoteInfo.host}:${this._remoteInfo.port}`;
      const target = `${action.payload.host}:${action.payload.port}`;
      if (this._config.mux && this._config.is_client && this._transport !== 'udp') {
        logger.info(`[relay-${this.id}] [${remote}] request over mux-${this._ctx.muxRelay.id}: ${target}`);
        return;
      }
      logger.info(`[relay] [${remote}] request: ${target}`);
    }
    if (type === CHANGE_PRESET_SUITE) {
      this.onChangePresetSuite(action);
      return;
    }
    this._inbound && this._inbound.onBroadcast(action);
    this._outbound && this._outbound.onBroadcast(action);
  }

  onChangePresetSuite(action) {
    const {type, suite, data} = action.payload;
    logger.verbose(`[relay] changing presets suite to: ${JSON.stringify(suite)}`);
    // 1. update preset list
    this.updatePresets(this.preparePresets([
      ...suite.presets,
      {'name': 'auto-conf'}
    ]));
    // 2. initialize newly created presets
    const transport = this._transport;
    const proxyRequest = this._proxyRequest;
    this._pipe.broadcast('pipe', {
      type: CONNECTION_CREATED,
      payload: {transport, ...this._remoteInfo}
    });
    if (this._config.is_client) {
      this._pipe.broadcast(null, {
        type: CONNECT_TO_REMOTE,
        payload: {...proxyRequest, keepAlive: true} // keep previous connection alive, don't re-connect
      });
    }
    // 3. re-pipe
    this._pipe.feed(type, data);
  }

  onEncoded(buffer) {
    if (this._config.is_client) {
      this._outbound.write(buffer);
    } else {
      this._inbound.write(buffer);
    }
  }

  onDecoded(buffer) {
    if (this._config.is_client) {
      this._inbound.write(buffer);
    } else {
      this._outbound.write(buffer);
    }
  }

  // methods

  encode(buffer, extraArgs) {
    if (this._pipe) {
      this._pipe.feed(PIPE_ENCODE, buffer, extraArgs);
    }
  }

  decode(buffer, extraArgs) {
    if (this._pipe) {
      this._pipe.feed(PIPE_DECODE, buffer, extraArgs);
    }
  }

  hasListener(name) {
    return this.listenerCount(name) > 0;
  }

  isOutboundReady() {
    return this._outbound && this._outbound.writable;
  }

  /**
   * preprocess preset list
   * @param presets
   * @returns {[]}
   */
  preparePresets(presets) {
    const last = presets[presets.length - 1];
    // add at least one "tracker" preset to the list
    if (!last || last.name !== 'tracker') {
      presets = presets.concat([{'name': 'tracker'}]);
    }
    return presets;
  }

  /**
   * update presets of pipe
   * @param value
   */
  updatePresets(value) {
    this._presets = typeof value === 'function' ? value(this._presets) : value;
    this._pipe.updateMiddlewares(this._presets);
  }

  /**
   * create pipes for both data forward and backward
   */
  createPipe(presets) {
    const pipe = new Pipe({presets, isUdp: this._transport === 'udp'}, this._config);
    pipe.on('broadcast', this.onBroadcast.bind(this)); // if no action were caught by presets
    pipe.on(`post_${PIPE_ENCODE}`, this.onEncoded);
    pipe.on(`post_${PIPE_DECODE}`, this.onDecoded);
    return pipe;
  }

  /**
   * destroy pipe, inbound and outbound
   */
  destroy() {
    if (!this._destroyed) {
      this._pipe && this._pipe.destroy();
      this._inbound && this._inbound.close();
      this._outbound && this._outbound.close();
      this._ctx = null;
      this._pipe = null;
      this._inbound = null;
      this._outbound = null;
      this._presets = null;
      this._remoteInfo = null;
      this._proxyRequest = null;
      this._destroyed = true;
      this._config = null;
    }
  }

}
