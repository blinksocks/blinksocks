import EventEmitter from 'events';
import {getPresetClassByName, IPresetStatic} from '../presets';
import {kebabCase} from '../utils';

let presetCache = {
  // 'ClassName': <preset>
};

function getInstanceFromCache(ImplClass, params) {
  let impl = presetCache[ImplClass.name];
  if (impl === undefined) {
    // only create one instance for IPresetStatic
    ImplClass.onInit(params);
    impl = new ImplClass(params);
    presetCache[ImplClass.name] = impl;
  }
  return impl;
}

function createPreset(name, params = {}) {
  const ImplClass = getPresetClassByName(name);
  let preset = null;
  if (ImplClass.__proto__.name === IPresetStatic.name) {
    preset = getInstanceFromCache(ImplClass, params);
  } else {
    if (!ImplClass.initialized) {
      ImplClass.onInit(params);
      ImplClass.initialized = true;
    }
    preset = new ImplClass(params);
  }
  return preset;
}

export const MIDDLEWARE_DIRECTION_UPWARD = 1;
export const MIDDLEWARE_DIRECTION_DOWNWARD = -1;

/**
 * abstraction of middleware
 */
export class Middleware extends EventEmitter {

  _impl = null;

  constructor(impl) {
    super();
    this.onPresetNext = this.onPresetNext.bind(this);
    this.onPresetBroadcast = this.onPresetBroadcast.bind(this);
    this.onPresetFail = this.onPresetFail.bind(this);
    this._impl = impl;
    this._impl.next = this.onPresetNext;
    this._impl.broadcast = this.onPresetBroadcast;
    this._impl.fail = this.onPresetFail;
  }

  get name() {
    return kebabCase(this._impl.constructor.name).replace(/(.*)-preset/i, '$1');
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
   */
  write(direction, {buffer, direct}) {
    const type = (direction === MIDDLEWARE_DIRECTION_UPWARD) ? 'Out' : 'In';

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

    // clientOut, serverOut, clientIn, serverIn
    const nextLifeCycleHook = (buf/* , isReverse = false */) => {
      const args = {buffer: buf, next, broadcast, direct, fail};
      const ret = __IS_CLIENT__ ? this._impl[`client${type}`](args) : this._impl[`server${type}`](args);
      if (ret instanceof Buffer) {
        next(ret);
      }
    };

    // beforeOut, beforeIn
    // NOTE: next(buf, isReverse) is not available in beforeOut/beforeIn
    const args = {buffer, next: nextLifeCycleHook, broadcast, direct, fail};
    const ret = this._impl[`before${type}`](args);
    if (ret instanceof Buffer) {
      nextLifeCycleHook(ret);
    }
  }

}

/**
 * create an instance of Middleware
 * @param name
 * @param params
 * @returns {Middleware}
 */
export function createMiddleware(name, params = {}) {
  try {
    const preset = createPreset(name, params);
    return new Middleware(preset);
  } catch (err) {
    console.error(err.message);
    process.exit(-1);
  }
  return null;
}

/**
 * destroy cached presets when program exit()
 */
export function cleanup() {
  const classNames = Object.keys(presetCache);
  for (const className of classNames) {
    presetCache[className].onDestroy();
  }
}

/**
 * clear preset cache and reset them to fresh status
 */
export function reset() {
  presetCache = {};
  __PRESETS__
    .map(({name}) => getPresetClassByName(name))
    .forEach((ImplClass) => ImplClass.initialized = false);
}
