import EventEmitter from 'events';
import {Pipe} from './pipe';
import {PIPE_ENCODE, PIPE_DECODE} from './middleware';
import {logger} from '../utils';
import {CONNECT_TO_REMOTE, CONNECTION_CREATED, CHANGE_PRESET_SUITE, MUX_FRAME} from '../presets';
import {
  TcpInbound, TcpOutbound,
  UdpInbound, UdpOutbound,
  TlsInbound, TlsOutbound,
  WsInbound, WsOutbound
} from '../transports';

const mapping = {
  'tcp': [TcpInbound, TcpOutbound],
  'udp': [UdpInbound, UdpOutbound],
  'tls': [TlsInbound, TlsOutbound],
  'ws': [WsInbound, WsOutbound]
};

// .on('encode')
// .on('decode')
// .on('close')
export class Relay extends EventEmitter {

  _transport = null;

  _isMux = false;

  _context = null;

  _proxyRequest = null;

  _inbound = null;

  _outbound = null;

  _pipe = null;

  _presets = [];

  static create({transport, presets, isMux, context, proxyRequest = null}) {
    let Inbound = null;
    let Outbound = null;
    if (transport === 'udp') {
      [Inbound, Outbound] = [UdpInbound, UdpOutbound];
    } else {
      [Inbound, Outbound] = __IS_CLIENT__ ? [TcpInbound, mapping[transport][1]] : [mapping[transport][0], TcpOutbound];
    }
    return new Relay({transport, presets, isMux, context, Inbound, Outbound, proxyRequest});
  }

  constructor({transport, presets, isMux, context, Inbound, Outbound, proxyRequest = null}) {
    super();
    this.updatePresets = this.updatePresets.bind(this);
    this.onBroadcast = this.onBroadcast.bind(this);
    this.onPipeEncoded = this.onPipeEncoded.bind(this);
    this.onPipeDecoded = this.onPipeDecoded.bind(this);
    this._transport = transport;
    this._isMux = isMux;
    this._context = context;
    this._proxyRequest = proxyRequest;
    // pipe
    this._presets = this.preparePresets(presets);
    this._pipe = this.createPipe(this._presets);
    // outbound
    this._inbound = new Inbound({context: context, pipe: this._pipe});
    this._outbound = new Outbound({inbound: this._inbound, pipe: this._pipe});
    this._outbound.updatePresets = this.updatePresets;
    // inbound
    this._inbound.updatePresets = this.updatePresets;
    this._inbound.setOutbound(this._outbound);
    this._inbound.on('close', () => {
      this.destroy();
      this.emit('close');
    });
    // initial action
    if (!isMux) {
      this._pipe.broadcast('pipe', {
        type: CONNECTION_CREATED,
        payload: {
          transport: transport,
          host: context ? context.remoteAddress : '*',
          port: context ? context.remotePort : '*'
        }
      });
    }
    if (__IS_CLIENT__ && proxyRequest !== null) {
      this._pipe.broadcast(null, {
        type: CONNECT_TO_REMOTE,
        payload: proxyRequest
      });
    }
    if (__IS_CLIENT__ && isMux) {
      this._pipe.broadcast(null, {
        type: CONNECT_TO_REMOTE,
        payload: {}
      });
    }
  }

  // hooks of pipe

  onBroadcast(action) {
    const type = action.type;
    if (type === CONNECT_TO_REMOTE) {
      if (__MUX__) {
        if (__IS_CLIENT__ && !this._isMux) {
          return;
        }
        if (__IS_SERVER__ && this._isMux) {
          action.payload.onConnected();
          return;
        }
      }
    }
    else if (type === MUX_FRAME) {
      this.emit('frame', action.payload);
      return;
    }
    else if (type === CHANGE_PRESET_SUITE) {
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
    const context = this._context;
    const proxyRequest = this._proxyRequest;
    this._pipe.broadcast('pipe', {
      type: CONNECTION_CREATED,
      payload: {
        transport: transport,
        host: context.remoteAddress,
        port: context.remotePort
      }
    });
    if (__IS_CLIENT__ && proxyRequest !== null) {
      this._pipe.broadcast(null, {
        type: CONNECT_TO_REMOTE,
        payload: {...proxyRequest, keepAlive: true} // keep previous connection alive, don't re-connect
      });
    }
    // 3. re-pipe
    this._pipe.feed(type, data);
  }

  onPipeEncoded(buffer) {
    if (this.hasListener('encode')) {
      this.emit('encode', buffer);
    } else {
      if (__IS_CLIENT__) {
        this._outbound.write(buffer);
      } else {
        this._inbound.write(buffer);
      }
    }
  }

  onPipeDecoded(buffer) {
    if (this.hasListener('decode')) {
      this.emit('decode', buffer);
    } else {
      if (__IS_CLIENT__) {
        this._inbound.write(buffer);
      } else {
        this._outbound.write(buffer);
      }
    }
  }

  // methods

  getContext() {
    return this._context;
  }

  hasListener(name) {
    return this.listenerCount(name) > 0;
  }

  /**
   * preprocess preset list
   * @param presets
   * @returns {[]}
   */
  preparePresets(presets) {
    const first = presets[0];
    const last = presets[presets.length - 1];
    // auto add "mux" preset
    if (this._isMux && (!first || first.name !== 'mux')) {
      presets = [{'name': 'mux'}].concat(presets);
    }
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
    const pipe = new Pipe({presets, isUdp: this._transport === 'udp'});
    pipe.on('broadcast', this.onBroadcast.bind(this)); // if no action were caught by presets
    pipe.on(`post_${PIPE_ENCODE}`, this.onPipeEncoded);
    pipe.on(`post_${PIPE_DECODE}`, this.onPipeDecoded);
    return pipe;
  }

  /**
   * destroy pipe, inbound and outbound
   */
  destroy() {
    this._pipe && this._pipe.destroy();
    this._inbound && this._inbound.destroy();
    this._outbound && this._outbound.destroy();
    this._pipe = null;
    this._inbound = null;
    this._outbound = null;
    this._presets = null;
    this._context = null;
    this._proxyRequest = null;
  }

}
