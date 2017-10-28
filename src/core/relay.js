import EventEmitter from 'events';
import uniqueId from 'lodash.uniqueid';
import {Pipe} from './pipe';
import {PIPE_ENCODE, PIPE_DECODE} from './middleware';
import {CONNECT_TO_REMOTE, CONNECTION_CREATED} from '../presets';
import {
  TcpInbound, TcpOutbound,
  UdpInbound, UdpOutbound,
  TlsInbound, TlsOutbound,
  WsInbound, WsOutbound
} from '../transports';

function preparePresets() {
  let presets = __PRESETS__;
  // add "tracker" preset to the preset list on both sides
  if (presets[presets.length - 1].name !== 'tracker') {
    presets = presets.concat([{'name': 'tracker'}]);
  }
  return presets;
}

// .on('close')
export class Relay extends EventEmitter {

  _inbound = null;

  _outbound = null;

  _transport = null;

  _pipe = null;

  _presets = [];

  constructor({transport, context, Inbound, Outbound, proxyRequest = null}) {
    super();
    this.setPresets = this.setPresets.bind(this);
    this.onBroadcast = this.onBroadcast.bind(this);
    this.postPipeForward = this.postPipeForward.bind(this);
    this.postPipeBackward = this.postPipeBackward.bind(this);
    this._transport = transport;
    // pipe
    this._presets = preparePresets();
    this._pipe = this.createPipe(this._presets);
    // outbound
    this._inbound = new Inbound({context: context, pipe: this._pipe});
    this._outbound = new Outbound({inbound: this._inbound, pipe: this._pipe});
    this._outbound.setPresets = this.setPresets;
    // inbound
    this._inbound.setPresets = this.setPresets;
    this._inbound.setOutbound(this._outbound);
    this._inbound.on('close', () => this.emit('close'));
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
    this._inbound.onBroadcast(action);
    this._outbound.onBroadcast(action);
  }

  postPipeForward(buffer) {
    if (__IS_CLIENT__) {
      this._outbound.write(buffer);
    } else {
      this._inbound.write(buffer);
    }
  }

  postPipeBackward(buffer) {
    if (__IS_CLIENT__) {
      this._inbound.write(buffer);
    } else {
      this._outbound.write(buffer);
    }
  }

  // methods

  /**
   * set a new presets and recreate the pipe
   * @param callback
   */
  setPresets(callback) {
    this._presets = callback(this._presets);
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
    pipe.on(`post_${PIPE_ENCODE}`, this.postPipeForward);
    pipe.on(`post_${PIPE_DECODE}`, this.postPipeBackward);
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
