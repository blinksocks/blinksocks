import EventEmitter from 'events';
import uniqueId from 'lodash.uniqueid';
import {Pipe} from './pipe';
import {PIPE_ENCODE, PIPE_DECODE} from './middleware';
import {CONNECT_TO_REMOTE, CONNECTION_CREATED, CHANGE_PRESET_SUITE} from '../presets';
import {
  TcpInbound, TcpOutbound,
  UdpInbound, UdpOutbound,
  TlsInbound, TlsOutbound,
  WsInbound, WsOutbound
} from '../transports';
import {logger} from '../utils';

function preparePresets(presets) {
  // add at least one "tracker" preset to the list
  const last = presets[presets.length - 1];
  if (!last || last.name !== 'tracker') {
    presets = presets.concat([{'name': 'tracker'}]);
  }
  return presets;
}

// .on('close')
export class Relay extends EventEmitter {

  _transport = null;

  _context = null;

  _proxyRequest = null;

  _inbound = null;

  _outbound = null;

  _pipe = null;

  _presets = [];

  constructor({transport, context, Inbound, Outbound, proxyRequest = null}) {
    super();
    this.updatePresets = this.updatePresets.bind(this);
    this.onBroadcast = this.onBroadcast.bind(this);
    this.postPipeEncode = this.postPipeEncode.bind(this);
    this.postPipeDecode = this.postPipeDecode.bind(this);
    this._transport = transport;
    this._context = context;
    this._proxyRequest = proxyRequest;
    // pipe
    this._presets = preparePresets(__PRESETS__);
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
        payload: proxyRequest
      });
    }
  }

  // hooks of pipe

  onBroadcast(action) {
    switch (action.type) {
      case CHANGE_PRESET_SUITE:
        this.onChangePresetSuite(action);
        break;
      default:
        this._inbound && this._inbound.onBroadcast(action);
        this._outbound && this._outbound.onBroadcast(action);
        break;
    }
  }

  onChangePresetSuite(action) {
    const {type, presets, data} = action.payload;
    // 1. update preset list
    this.updatePresets(preparePresets(presets.concat([{'name': 'auto-conf'}])));
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

  postPipeEncode(buffer) {
    if (__IS_CLIENT__) {
      this._outbound.write(buffer);
    } else {
      this._inbound.write(buffer);
    }
  }

  postPipeDecode(buffer) {
    if (__IS_CLIENT__) {
      this._inbound.write(buffer);
    } else {
      this._outbound.write(buffer);
    }
  }

  // methods

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
    pipe.on(`post_${PIPE_ENCODE}`, this.postPipeEncode);
    pipe.on(`post_${PIPE_DECODE}`, this.postPipeDecode);
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

const mapping = {
  'tcp': [TcpInbound, TcpOutbound],
  'udp': [UdpInbound, UdpOutbound],
  'tls': [TlsInbound, TlsOutbound],
  'ws': [WsInbound, WsOutbound]
};

export function createRelay(transport, context, proxyRequest = null) {
  let Inbound = null;
  let Outbound = null;
  if (transport === 'udp') {
    [Inbound, Outbound] = [UdpInbound, UdpOutbound];
  } else {
    [Inbound, Outbound] = __IS_CLIENT__ ? [TcpInbound, mapping[transport][1]] : [mapping[transport][0], TcpOutbound];
  }
  const props = {transport, context, Inbound, Outbound, proxyRequest};
  const relay = new Relay(props);
  relay.id = uniqueId(`${transport}_`);
  return relay;
}
