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

  constructor(props) {
    super(props);
    try {
      const ObfsImplClass = require(`../../../presets/obfs/${__OBFS__}`).default;
      const impl = new ObfsImplClass({obfs_params: __OBFS_PARAMS__});
      if (checkMiddleware(__OBFS__, impl)) {
        this._impl = impl;
      }
    } catch (err) {
      Logger.fatal(err.message);
      process.exit(-1);
    }
  }

  write(direction, buffer) {
    return new Promise((next) => {
      const broadcast = this.broadcast;
      const args = [buffer, next, broadcast];

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
