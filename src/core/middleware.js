import EventEmitter from 'events';
import logger from './logger';

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

    const next = (buf) => {
      const args = {
        buffer: buf,
        next: (processed) => this.emit(`next_${direction}`, processed),
        broadcast,
        direct,
        fail
      };
      // clientOut, serverOut, clientIn, serverIn
      const ret = __IS_CLIENT__ ? this._impl[`client${type}`](args) : this._impl[`server${type}`](args);
      if (typeof ret !== 'undefined') {
        args.next(ret);
      }
    };

    // beforeOut, beforeIn
    const r = this._impl[`before${type}`]({buffer, next, broadcast, direct, fail});
    if (typeof r !== 'undefined') {
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
    const ImplClass = require(`../presets/${name}`).default;
    const impl = new ImplClass(params);

    checkMiddleware(ImplClass.name, impl);

    return new Middleware(impl);
  } catch (err) {
    logger.error(err.message);
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
