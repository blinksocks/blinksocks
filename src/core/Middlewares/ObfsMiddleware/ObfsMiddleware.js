/* eslint-disable no-undef */
import {
  MIDDLEWARE_DIRECTION_UPWARD,
  MIDDLEWARE_DIRECTION_DOWNWARD,
  IMiddleware,
  checkMiddleware
} from '../Interface';

const Logger = require('../../../utils/logger')(__filename);

export class ObfsMiddleware extends IMiddleware {

  _impl = null;

  _direction = null;

  _onNotify = null;

  constructor(props) {
    super(props);
    this._direction = props.direction;
    try {
      const ObfsImplClass = require(`../../../presets/obfs/${__OBFS__}`).default;
      const impl = new ObfsImplClass();
      if (checkMiddleware(__OBFS__, impl)) {
        this._impl = impl;
      }
    } catch (err) {
      Logger.fatal(err.message);
      process.exit(-1);
    }
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
