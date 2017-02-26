import EventEmitter from 'events';

export const MIDDLEWARE_DIRECTION_UPWARD = 0;
export const MIDDLEWARE_DIRECTION_DOWNWARD = 1;

export const MIDDLEWARE_TYPE_FRAME = 0;
export const MIDDLEWARE_TYPE_CRYPTO = 1;
export const MIDDLEWARE_TYPE_PROTOCOL = 2;
export const MIDDLEWARE_TYPE_OBFS = 3;

const Logger = require('../utils/logger')(__filename);

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
   */
  write(direction, buffer) {
    const type = {
      [MIDDLEWARE_DIRECTION_UPWARD]: 'Out',
      [MIDDLEWARE_DIRECTION_DOWNWARD]: 'In'
    }[direction];
    const broadcast = this._broadcast;

    const next = (buf) => {
      const args = {
        buffer: buf,
        next: (buf) => this.emit(`next_${direction}`, buf),
        broadcast
      };
      const ret = __IS_CLIENT__ ?
        this._impl[`client${type}`](args) :
        this._impl[`server${type}`](args);
      if (typeof ret !== 'undefined') {
        args.next(ret);
      }
    };

    const r = this._impl[`before${type}`]({buffer, next, broadcast});

    if (typeof r !== 'undefined') {
      next(r);
    }
  }

}

/**
 * create an instance of Middleware
 * @param type
 * @param props
 * @returns {Middleware}
 */
export function createMiddleware(type, props = []) {
  const array = {
    [MIDDLEWARE_TYPE_FRAME]: [`frame/${__FRAME__}`, __FRAME_PARAMS__],
    [MIDDLEWARE_TYPE_CRYPTO]: [`crypto/${__CRYPTO__}`, __CRYPTO_PARAMS__],
    [MIDDLEWARE_TYPE_PROTOCOL]: [`protocol/${__PROTOCOL__}`, __PROTOCOL_PARAMS__],
    [MIDDLEWARE_TYPE_OBFS]: [`obfs/${__OBFS__}`, __OBFS_PARAMS__]
  }[type];

  try {
    const ImplClass = require(`../presets/${array[0]}`).default;
    const params = Array.isArray(array[1]) ? array[1] : array[1].split(',').filter((param) => param.length > 0);

    const impl = new ImplClass(...props.concat(params));

    checkMiddleware(ImplClass.name, impl);

    return new Middleware(impl);
  } catch (err) {
    Logger.fatal(err.message);
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
