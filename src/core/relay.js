import EventEmitter from 'events';
import { ACL } from './acl';
import { Pipe } from './pipe';
import { Tracker } from './tracker';
import { logger } from '../utils';

import {
  TcpInbound, TcpOutbound,
  UdpInbound, UdpOutbound,
  TlsInbound, TlsOutbound,
  WsInbound, WsOutbound,
  WssInbound, WssOutbound,
  MuxInbound, MuxOutbound,
} from '../transports';

import { PIPE_ENCODE, PIPE_DECODE, CONNECT_TO_REMOTE, PRESET_FAILED } from '../constants';

/**
 * [client side]
 * app <==> (TcpInbound) relay (MuxOutbound)
 *     <==> (MuxInbound) muxRelay (TcpOutbound, ...) <--->
 *
 * [server side]
 *     <---> (TcpInbound, ...) muxRelay (MuxOutbound) <==>
 *           (MuxInbound) relay (TcpOutbound) <==> app
 */

// .on('_connect')
// .on('_read')
// .on('_write')
// .on('_error');
// .on('close')
export class Relay extends EventEmitter {

  static idcounter = 0;

  _id = null;

  _config = null;

  _acl = null;

  _tracker = null;

  _ctx = null;

  _transport = null;

  _remoteInfo = null;

  _proxyRequest = null;

  _inbound = null;

  _outbound = null;

  _pipe = null;

  _presets = [];

  _destroyed = false;

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
    this._id = Relay.idcounter++;
    this._config = config;
    this._transport = transport;
    this._remoteInfo = context.remoteInfo;
    // pipe
    this._presets = this.preparePresets(presets);
    this._pipe = this.createPipe(this._presets);
    // ctx
    this._ctx = {
      relay: this,
      pipe: this._pipe,
      rawPresets: presets,
      ...context,
    };
    // bounds
    const { Inbound, Outbound } = this.getBounds(transport);
    const props = { config, context: this._ctx };
    const inbound = new Inbound(props);
    const outbound = new Outbound(props);
    this._inbound = inbound;
    this._outbound = outbound;
    // outbound
    this._outbound.setInbound(this._inbound);
    this._outbound.on('_error', (err) => this.emit('_error', err));
    this._outbound.on('close', () => this.onBoundClose(outbound, inbound));
    // inbound
    this._inbound.setOutbound(this._outbound);
    this._inbound.on('_error', (err) => this.emit('_error', err));
    this._inbound.on('close', () => this.onBoundClose(inbound, outbound));
    // acl
    if (config.acl) {
      this._acl = new ACL({ remoteInfo: this._remoteInfo, rules: config.acl_rules });
      this._acl.on('action', this.onBroadcast.bind(this));
    }
    // tracker
    this._tracker = new Tracker({ config, transport });
    this._tracker.setSourceAddress(this._remoteInfo.host, this._remoteInfo.port);
  }

  init({ proxyRequest }) {
    if (proxyRequest) {
      this._proxyRequest = proxyRequest;
      this._pipe.initTargetAddress(proxyRequest);
      this.onBroadcast({ type: CONNECT_TO_REMOTE, payload: proxyRequest });
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
      'wss': [WssInbound, WssOutbound],
      'mux': [MuxInbound, MuxOutbound],
    };
    let Inbound = null, Outbound = null;
    if (transport === 'udp') {
      [Inbound, Outbound] = [UdpInbound, UdpOutbound];
    } else {
      [Inbound, Outbound] = this._config.is_client ? [TcpInbound, mapping[transport][1]] : [mapping[transport][0], TcpOutbound];
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

  // getters

  getOutbound() {
    return this._outbound;
  }

  getInbound() {
    return this._inbound;
  }

  // hooks of pipe

  onBroadcast(action) {
    if (action.type === CONNECT_TO_REMOTE) {
      const { host: sourceHost, port: sourcePort } = this._remoteInfo;
      const { host: targetHost, port: targetPort } = action.payload;
      const remote = `${sourceHost}:${sourcePort}`;
      const target = `${targetHost}:${targetPort}`;
      this.emit('_connect', action.payload);
      // tracker
      if (this._tracker) {
        this._tracker.setTargetAddress(targetHost, targetPort);
      }
      // acl
      if (this._acl && this._acl.setTargetAddress(targetHost, targetPort)) {
        return;
      }
      // mux
      if (this._config.mux && this._config.is_client && this._transport !== 'udp') {
        logger.info(`[relay-${this.id}] [${remote}] request over mux-${this._ctx.muxRelay.id}: ${target}`);
        return;
      }
      logger.info(`[relay] [${remote}] request: ${target}`);
    }
    if (action.type === PRESET_FAILED) {
      if (this._acl && this._acl.checkFailTimes(this._config.acl_tries)) {
        return;
      }
    }
    this._inbound && this._inbound.onBroadcast(action);
    this._outbound && this._outbound.onBroadcast(action);
  }

  onPreDecode = (buffer, cb) => {
    if (this._tracker !== null) {
      this._tracker.trace(PIPE_DECODE, buffer.length);
    }
    if (this._config.is_server) {
      if (this._acl) {
        this._acl.collect(PIPE_DECODE, buffer.length);
      }
    }
    cb(buffer);
    setImmediate(() => this.emit('_read', buffer.length));
  };

  onEncoded = (buffer) => {
    if (this._tracker !== null) {
      this._tracker.trace(PIPE_ENCODE, buffer.length);
    }
    if (this._config.is_client) {
      this._outbound.write(buffer);
    } else {
      if (this._acl !== null) {
        this._acl.collect(PIPE_ENCODE, buffer.length);
      }
      this._inbound.write(buffer);
    }
    setImmediate(() => this.emit('_write', buffer.length));
  };

  onDecoded = (buffer) => {
    if (this._config.is_client) {
      this._inbound.write(buffer);
    } else {
      this._outbound.write(buffer);
    }
  };

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

  isOutboundReady() {
    return this._outbound && this._outbound.writable;
  }

  /**
   * preprocess preset list
   * @param presets
   * @returns {[]}
   */
  preparePresets(presets) {
    return presets;
  }

  /**
   * create pipes for both data forward and backward
   */
  createPipe(presets) {
    const pipe = new Pipe({ config: this._config, presets, isUdp: this._transport === 'udp' });
    pipe.on('broadcast', this.onBroadcast.bind(this)); // if no action were caught by presets
    pipe.on(`pre_${PIPE_DECODE}`, this.onPreDecode);
    pipe.on(`post_${PIPE_ENCODE}`, this.onEncoded);
    pipe.on(`post_${PIPE_DECODE}`, this.onDecoded);
    return pipe;
  }

  /**
   * destroy pipe, inbound and outbound
   */
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
