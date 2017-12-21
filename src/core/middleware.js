import EventEmitter from 'events';
import {getPresetClassByName, IPresetStatic} from '../presets';
import {kebabCase} from '../utils';

const staticPresetCache = new Map(/* 'ClassName': <preset> */);

function createPreset(name, params = {}) {
  const ImplClass = getPresetClassByName(name);
  const createOne = () => {
    ImplClass.checkParams(params);
    ImplClass.onInit(params);
    return new ImplClass(params);
  };
  let preset = null;
  if (IPresetStatic.isPrototypeOf(ImplClass)) {
    // only create one instance for IPresetStatic
    preset = staticPresetCache.get(ImplClass.name);
    if (preset === undefined) {
      preset = createOne();
      staticPresetCache.set(ImplClass.name, preset);
    }
  } else {
    preset = createOne();
  }
  return preset;
}

export const PIPE_ENCODE = 1;
export const PIPE_DECODE = -1;

/**
 * abstraction of middleware
 */
export class Middleware extends EventEmitter {

  _impl = null;

  constructor(preset) {
    super();
    this.onPresetNext = this.onPresetNext.bind(this);
    this.onPresetBroadcast = this.onPresetBroadcast.bind(this);
    this.onPresetFail = this.onPresetFail.bind(this);
    this._impl = createPreset(preset.name, preset.params || {});
    this._impl.next = this.onPresetNext;
    this._impl.broadcast = this.onPresetBroadcast;
    this._impl.fail = this.onPresetFail;
  }

  get name() {
    return this._impl.getName() || kebabCase(this._impl.constructor.name).replace(/(.*)-preset/i, '$1');
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
    // prevent destroy on static preset
    if (!(this._impl instanceof IPresetStatic)) {
      this._impl.onDestroy();
    }
    this.removeAllListeners();
  }

  /**
   * call hook functions of implement in order
   * @param direction
   * @param buffer
   * @param direct
   * @param isUdp
   * @param extraArgs
   */
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
      const ret = __IS_CLIENT__ ? this._impl[`client${type}`](args, extraArgs) : this._impl[`server${type}`](args, extraArgs);
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

/**
 * destroy cached presets when program exit()
 */
export function cleanup() {
  for (const preset of staticPresetCache.values()) {
    preset.onDestroy();
  }
}
