import {
  MIDDLEWARE_DIRECTION_UPWARD,
  MIDDLEWARE_DIRECTION_DOWNWARD,
  IMiddleware
} from '../Interface';

const Logger = require('../../../utils/logger')(__filename);

export class ProtocolMiddleware extends IMiddleware {

  _impl = null;

  _direction = null;

  _onNotify = null;

  constructor(props) {
    super(props);
    this._direction = props.direction;
    try {
      const ProtocolImplClass = require(`../../../presets/protocols/${__PROTOCOL__}`).default;
      const impl = new ProtocolImplClass();
      if (this.checkMiddleware(impl)) {
        this._impl = impl;
      }
    } catch (err) {
      Logger.fatal(err.message);
      process.exit(-1);
    }
  }

  checkMiddleware(impl) {
    const requiredMethods = [
      'forwardToServer',
      'forwardToDst',
      'backwardToClient',
      'backwardToApplication'
    ];
    if (requiredMethods.some((method) => typeof impl[method] !== 'function')) {
      throw Error(`all methods [${requiredMethods.toString()}] in ${__PROTOCOL__} must be implemented`);
    }
    return true;
  }

  subscribe(notifier) {
    this._onNotify = notifier;
  }

  write(buffer) {
    return new Promise((next) => {
      const direction = this._direction;
      const onNotify = this._onNotify;
      const args = [buffer, next, onNotify];

      let ret = null;

      if (__IS_CLIENT__ && direction === MIDDLEWARE_DIRECTION_UPWARD) {
        ret = this._impl.forwardToServer(...args);
      }

      if (__IS_CLIENT__ && direction === MIDDLEWARE_DIRECTION_DOWNWARD) {
        ret = this._impl.backwardToApplication(...args);
      }

      if (__IS_SERVER__ && direction === MIDDLEWARE_DIRECTION_UPWARD) {
        ret = this._impl.backwardToClient(...args);
      }

      if (__IS_SERVER__ && direction === MIDDLEWARE_DIRECTION_DOWNWARD) {
        ret = this._impl.forwardToDst(...args);
      }

      if (ret !== null && typeof ret !== 'undefined') {
        next(ret);
      }
    });
  }

}
