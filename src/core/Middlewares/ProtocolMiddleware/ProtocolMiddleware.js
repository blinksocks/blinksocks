/* eslint-disable no-undef */
import {
  MIDDLEWARE_DIRECTION_UPWARD,
  MIDDLEWARE_DIRECTION_DOWNWARD,
  IMiddleware,
  checkMiddleware
} from '../Interface';
import {Utils} from '../../../utils';

const Logger = require('../../../utils/logger')(__filename);

// NOTE: This middleware will add two bytes (indicates the total length of the packet)
// at the beginning of payload when upstream.
//
// +-----+----------------+
// | LEN |    PAYLOAD     |
// +-----+----------------+
// |  2  |    Variable    |
// +-----+----------------+

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
      if (checkMiddleware(__PROTOCOL__, impl)) {
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
        args[0] = args[0].slice(2);
        ret = this._impl.backwardToApplication(...args);
      }

      if (__IS_SERVER__ && direction === MIDDLEWARE_DIRECTION_UPWARD) {
        ret = this._impl.backwardToClient(...args);
      }

      if (__IS_SERVER__ && direction === MIDDLEWARE_DIRECTION_DOWNWARD) {
        args[0] = args[0].slice(2);
        ret = this._impl.forwardToDst(...args);
      }

      if (ret !== null && typeof ret !== 'undefined') {
        if (direction === MIDDLEWARE_DIRECTION_UPWARD) {
          next(Buffer.concat([
            /* LEN: */Buffer.from(Utils.numberToArray(2 + ret.length)),
            ret
          ]));
        } else {
          next(ret);
        }
      }
    });
  }

}
