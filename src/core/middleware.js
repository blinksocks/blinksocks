import EventEmitter from 'events';
import {getPresetClassByName} from '../presets';
import {kebabCase} from '../utils';

export const MIDDLEWARE_DIRECTION_UPWARD = 1;
export const MIDDLEWARE_DIRECTION_DOWNWARD = -1;

/**
 * abstraction of middleware
 */
export class Middleware extends EventEmitter {

  _broadcast = null;

  _impl = null;

  constructor(impl) {
    super();
    this._impl = impl;
  }

  getName() {
    return kebabCase(this._impl.constructor.name).replace(/(.*)-preset/i, '$1');
  }

  subscribe(receiver) {
    this._broadcast = receiver;
  }

  onNotified(action) {
    return this._impl.onNotified(action);
  }

  /**
   * call hook functions of implement in order
   * @param direction
   * @param buffer
   * @param direct
   * @param fail
   */
  write(direction, {buffer, direct, fail}) {
    const type = {
      [MIDDLEWARE_DIRECTION_UPWARD]: 'Out',
      [MIDDLEWARE_DIRECTION_DOWNWARD]: 'In'
    }[direction];
    const broadcast = this._broadcast;

    const _fail = (message) => fail(this.getName(), message);

    // NOTE: next(buf, isReverse) is not available in beforeOut/beforeIn
    const next = (buf/* , isReverse = false */) => {
      const args = {
        buffer: buf,
        next: (processed, isReverse = false) => {
          const hasListener = this.emit(`next_${isReverse ? -direction : direction}`, processed);
          // oh my nice hack to deal with reverse pipeline if haven't been created
          if (!hasListener) {
            direct(processed, isReverse);
          }
        },
        broadcast,
        direct,
        fail: _fail
      };
      // clientOut, serverOut, clientIn, serverIn
      const ret = __IS_CLIENT__ ? this._impl[`client${type}`](args) : this._impl[`server${type}`](args);
      if (ret instanceof Buffer) {
        args.next(ret);
      }
    };

    // beforeOut, beforeIn
    const r = this._impl[`before${type}`]({buffer, next, broadcast, direct, fail: _fail});
    if (r instanceof Buffer) {
      next(r);
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
    const ImplClass = getPresetClassByName(name);
    const impl = new ImplClass(params);

    checkMiddleware(ImplClass.name, impl);

    return new Middleware(impl);
  } catch (err) {
    console.error(err.message);
    process.exit(-1);
  }
  return null;
}

/**
 * check if a middleware implement is valid or not
 * @param name
 * @param impl
 * @returns {boolean}
 */
function checkMiddleware(name, impl) {
  const requiredMethods = [
    'clientOut',
    'serverIn',
    'serverOut',
    'clientIn'
  ];
  if (requiredMethods.some((method) => typeof impl[method] !== 'function')) {
    throw Error(`all methods [${requiredMethods.toString()}] in ${name} must be implemented`);
  }
  return true;
}
