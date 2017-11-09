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

function preparePresets(presets) {
  const auto_conf_preset = presets.find(({name}) => name === 'auto-conf');
  if (auto_conf_preset !== undefined) {
    presets = [auto_conf_preset]; // drop any other presets when have "auto-conf" preset
  } else {
    // add "tracker" preset to the preset list on both sides
    const last = presets[presets.length - 1];
    if (!last || last.name !== 'tracker') {
      presets = presets.concat([{'name': 'tracker'}]);
    }
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
    this.setPresets = this.setPresets.bind(this);
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
    this._outbound.setPresets = this.setPresets;
    // inbound
    this._inbound.setPresets = this.setPresets;
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
    const {type, presets, data, createWrapper} = action.payload;
    // 1. replace preset list
    this.setPresets(preparePresets(presets));
    // 2. handle post-pipe event when encode
    if (__IS_CLIENT__ && type === PIPE_ENCODE) {
      const event = `post_${PIPE_ENCODE}`;
      this._pipe.removeListener(event, this.postPipeEncode);
      this._pipe.once(event, (buffer) => {
        this.postPipeEncode(createWrapper(buffer));
        this._pipe.on(event, this.postPipeEncode);
      });
    }
    // 3. initialize newly created presets
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
    // 4. re-pipe
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
   * set a new presets and recreate the pipe
   * @param value
   */
  setPresets(value) {
    this._presets = typeof value === 'function' ? value(this._presets) : value;
    this._pipe.destroy();
    this._pipe = this.createPipe(this._presets);
    this._inbound._pipe = this._pipe;
    this._outbound._pipe = this._pipe;
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
