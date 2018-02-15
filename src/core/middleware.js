import EventEmitter from 'events';
import {getPresetClassByName} from '../presets';
import {PIPE_ENCODE} from '../constants';
import {kebabCase} from '../utils';

function createPreset({config, preset}) {
  const name = preset.name;
  const params = preset.params || {};
  const ImplClass = getPresetClassByName(name);
  const instance = new ImplClass({config, params});
  instance.onInit(params);
  return instance;
}

export class Middleware extends EventEmitter {

  _config = null;

  _impl = null;

  constructor({config, preset}) {
    super();
    this.onPresetNext = this.onPresetNext.bind(this);
    this.onPresetBroadcast = this.onPresetBroadcast.bind(this);
    this.onPresetFail = this.onPresetFail.bind(this);
    this._config = config;
    this._impl = createPreset({config, preset});
    this._impl.next = this.onPresetNext;
    this._impl.broadcast = this.onPresetBroadcast;
    this._impl.fail = this.onPresetFail;
  }

  get name() {
    return kebabCase(this._impl.constructor.name).replace(/(.*)-preset/i, '$1');
  }

  getImplement() {
    return this._impl;
  }

  hasListener(event) {
    return this.listenerCount(event) > 0;
  }

  notify(action) {
    return this._impl.onNotified(action);
  }

  onPresetNext(direction, buffer) {
    this.emit(`next_${direction}`, buffer);
  }

  onPresetBroadcast(action) {
    this.emit('broadcast', this.name, action);
  }

  onPresetFail(message) {
    this.emit('fail', this.name, message);
  }

  onDestroy() {
    this._impl.onDestroy();
    this.removeAllListeners();
  }

  write({direction, buffer, direct, isUdp}, extraArgs) {
    const type = (direction === PIPE_ENCODE ? 'Out' : 'In') + (isUdp ? 'Udp' : '');

    // prepare args
    const broadcast = this.onPresetBroadcast;
    const fail = this.onPresetFail;
    const next = (processed, isReverse = false) => {
      // oh my nice hack to deal with reverse pipeline if haven't been created
      const hasListener = this.emit(`next_${isReverse ? -direction : direction}`, processed);
      if (!hasListener) {
        direct(processed, isReverse);
      }
    };

    // clientXXX, serverXXX
    const nextLifeCycleHook = (buf/* , isReverse = false */) => {
      const args = {buffer: buf, next, broadcast, direct, fail};
      const ret = this._config.is_client ? this._impl[`client${type}`](args, extraArgs) : this._impl[`server${type}`](args, extraArgs);
      if (ret instanceof Buffer) {
        next(ret);
      }
    };

    // beforeXXX
    // NOTE: next(buf, isReverse) is not available in beforeXXX
    const args = {buffer, next: nextLifeCycleHook, broadcast, direct, fail};
    const ret = this._impl[`before${type}`](args, extraArgs);
    if (ret instanceof Buffer) {
      nextLifeCycleHook(ret);
    }
  }

}
