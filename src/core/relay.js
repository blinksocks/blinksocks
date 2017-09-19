import EventEmitter from 'events';
import {Pipe, createMiddleware, MIDDLEWARE_DIRECTION_UPWARD, MIDDLEWARE_DIRECTION_DOWNWARD} from '../core';
import {CONNECTION_CREATED} from '../presets';

// .on('close')
export class Relay extends EventEmitter {

  _inbound = null;

  _outbound = null;

  _pipe = null;

  _presets = [];

  constructor({context, Inbound, Outbound}) {
    super();
    this.setPresets = this.setPresets.bind(this);
    this.onBroadcast = this.onBroadcast.bind(this);
    this.sendForward = this.sendForward.bind(this);
    this.sendBackward = this.sendBackward.bind(this);
    let presets = __PRESETS__;
    // prepend "proxy" preset to the top of presets on client side
    if (__IS_CLIENT__ && !['proxy', 'tunnel'].includes(presets[0].name)) {
      presets = [{name: 'proxy'}].concat(presets);
    }
    // add "tracker" preset to the preset list on both sides
    if (presets[presets.length - 1].name !== 'tracker') {
      presets = presets.concat([{name: 'tracker'}]);
    }
    this._presets = presets;
    this._pipe = this.createPipe(presets);
    // outbound
    this._inbound = new Inbound({context: context, pipe: this._pipe});
    this._outbound = new Outbound({inbound: this._inbound, pipe: this._pipe});
    this._outbound.setPresets = this.setPresets;
    // inbound
    this._inbound.setPresets = this.setPresets;
    this._inbound.setOutbound(this._outbound);
    this._inbound.on('close', () => this.emit('close'));

    this._pipe.broadcast('pipe', {
      type: CONNECTION_CREATED,
      payload: {
        host: context.remoteAddress,
        port: context.remotePort
      }
    });
  }

  // events

  onBroadcast(action) {
    this._inbound.onBroadcast(action);
    this._outbound.onBroadcast(action);
  }

  // methods

  sendForward(buffer) {
    if (__IS_CLIENT__) {
      this._outbound.write(buffer);
    } else {
      this._inbound.write(buffer);
    }
  }

  sendBackward(buffer) {
    if (__IS_CLIENT__) {
      this._inbound.write(buffer);
    } else {
      this._outbound.write(buffer);
    }
  }

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
    pipe.on(`next_${MIDDLEWARE_DIRECTION_UPWARD}`, this.sendForward);
    pipe.on(`next_${MIDDLEWARE_DIRECTION_DOWNWARD}`, this.sendBackward);
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
