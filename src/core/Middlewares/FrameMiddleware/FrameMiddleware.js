/* eslint-disable no-undef */
import {
  MIDDLEWARE_DIRECTION_UPWARD,
  MIDDLEWARE_DIRECTION_DOWNWARD,
  IMiddleware
} from '../Interface';

import {Address} from '../../Address';

import {SOCKET_CONNECT_TO_DST} from '../../../constants';

import {
  ATYP_V4,
  // ATYP_V6,
  ATYP_DOMAIN
} from '../../../proxies/common';

const Logger = require('../../../utils/logger')(__filename);

// +------+----------+----------+----------+
// | ATYP | DST.ADDR | DST.PORT |   DATA   |
// +------+----------+----------+----------+
// |  1   | Variable |    2     | Variable |
// +------+----------+----------+----------+

export class FrameMiddleware extends IMiddleware {

  _target_address = null;

  _direction = null;

  _onNotify = null;

  _is_connected = false;

  constructor(props) {
    super(props);
    this._target_address = props.address;
    this._direction = props.direction;
  }

  subscribe(notifier) {
    this._onNotify = notifier;
  }

  write(buffer) {
    return new Promise((next) => {
      const direction = this._direction;

      if (direction === MIDDLEWARE_DIRECTION_UPWARD) {
        if (__IS_SERVER__) {
          next(this.pack(new Address(), buffer));
        } else {
          next(this.pack(this._target_address, buffer));
        }
      }

      if (direction === MIDDLEWARE_DIRECTION_DOWNWARD) {
        const frame = this.unpack(buffer);

        if (frame === null && Logger.isWarnEnabled()) {
          throw Error(`-x-> dropped unidentified packet ${buffer.length} bytes @FrameMiddleware`);
        }

        if (__IS_SERVER__ && !this._is_connected) {
          // connect to the real server
          const addr = new Address({
            ATYP: frame.ATYP,
            DSTADDR: frame.DSTADDR,
            DSTPORT: frame.DSTPORT
          });
          const onConnected = () => {
            next(frame.DATA);
            this._is_connected = true;
          };
          this._onNotify({
            type: SOCKET_CONNECT_TO_DST,
            payload: [addr, onConnected]
          });
        } else {
          next(frame.DATA);
        }
      }
    });
  }

  pack(address, data) {
    const {ATYP, DSTADDR, DSTPORT} = address;

    let addr = null;
    if (ATYP === ATYP_DOMAIN) {
      addr = [DSTADDR.length, ...DSTADDR];
    } else {
      addr = DSTADDR;
    }

    return Buffer.from([ATYP, ...addr, ...DSTPORT, ...data]);
  }

  unpack(buffer) {
    const _buffer = Buffer.from(buffer);

    if (_buffer.length < 7) {
      Logger.debug(`invalid length: ${_buffer.length}`);
      return null;
    }

    let DSTADDR = null;
    let DSTPORT = null;
    switch (_buffer[0]) {
      case ATYP_V4: {
        DSTADDR = _buffer.slice(1, 5);
        DSTPORT = _buffer.slice(5, 7);
        break;
      }
      // case ATYP_V6: {
      //   if (_buffer.length < 21) {
      //     Logger.debug(`invalid length: ${_buffer.length}`);
      //     return null;
      //   }
      //   DSTADDR = _buffer.slice(2, 19);
      //   DSTPORT = _buffer.slice(19, 21);
      //   break;
      // }
      case ATYP_DOMAIN: {
        const domainLen = _buffer[1];
        if (_buffer.length < 4 + domainLen) {
          Logger.debug(`invalid length: ${_buffer.length}`);
          return null;
        }
        DSTADDR = _buffer.slice(2, 2 + domainLen);
        DSTPORT = _buffer.slice(2 + domainLen, 4 + domainLen);
        break;
      }
      default:
        Logger.debug(`unknown ATYP: ${_buffer[0]}`);
        return null;
    }

    return {
      ATYP: _buffer[0],
      DSTADDR,
      DSTPORT,
      DATA: _buffer.slice(DSTADDR.length + (_buffer[0] === ATYP_DOMAIN ? 4 : 3)),
      toBuffer() {
        return Buffer.from([this.ATYP, ...this.DSTADDR, ...this.DSTPORT, ...this.DATA]);
      }
    };
  }

}
