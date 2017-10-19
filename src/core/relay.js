import EventEmitter from 'events';
import {Pipe} from './pipe';
import {createMiddleware, PIPE_ENCODE, PIPE_DECODE} from './middleware';
import {CONNECT_TO_REMOTE, CONNECTION_CREATED} from '../presets';

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

  _pipe = null;

  _presets = [];

  constructor({context, Inbound, Outbound, proxyRequest = null}) {
    super();
    this.setPresets = this.setPresets.bind(this);
    this.onBroadcast = this.onBroadcast.bind(this);
    this.postPipeForward = this.postPipeForward.bind(this);
    this.postPipeBackward = this.postPipeBackward.bind(this);
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
        host: context.remoteAddress,
        port: context.remotePort
      }
    });
    if (__IS_CLIENT__) {
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
    const middlewares = presets.map((preset) => createMiddleware(preset.name, preset.params || {}));
    const pipe = new Pipe();
    pipe.on('broadcast', this.onBroadcast.bind(this)); // if no action were caught by presets
    pipe.on(`post_${PIPE_ENCODE}`, this.postPipeForward);
    pipe.on(`post_${PIPE_DECODE}`, this.postPipeBackward);
    pipe.setMiddlewares(middlewares);
    return pipe;
  }

  /**
   * destroy pipe, inbound and outbound
   */
  destroy() {
    this._pipe.destroy();
    this._inbound.destroy();
    this._outbound.destroy();
    this._pipe = null;
    this._inbound = null;
    this._outbound = null;
    this._presets = null;
  }

}
