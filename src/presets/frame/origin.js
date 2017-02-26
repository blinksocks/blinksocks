import logger from 'winston';
import {IPreset} from '../interface';
import {SOCKET_CONNECT_TO_DST} from '../actions';
import {Address} from '../../core/address';

import {
  ATYP_V4,
  // ATYP_V6,
  ATYP_DOMAIN
} from '../../proxies/common';

/**
 * @description
 *   Tell server where is the destination.
 *
 * @params
 *   no
 *
 * @examples
 *   "frame": "origin"
 *   "frame_params": ""
 *
 * @protocol
 *
 *   # TCP handshake
 *   +------+----------+----------+----------+
 *   | ATYP | DST.ADDR | DST.PORT |   DATA   |
 *   +------+----------+----------+----------+
 *   |  1   | Variable |    2     | Variable |
 *   +------+----------+----------+----------+
 *
 *   # TCP chunk
 *   +----------+
 *   |   DATA   |
 *   +----------+
 *   | Variable |
 *   +----------+
 */
export default class OriginFrame extends IPreset {

  _targetAddress = null; // client use only

  _isHandshakeDone = false;

  constructor(address) {
    super();
    this._targetAddress = address;
  }

  clientOut({buffer}) {
    if (!this._isHandshakeDone) {
      this._isHandshakeDone = true;
      return this.pack(this._targetAddress, buffer);
    } else {
      return buffer;
    }
  }

  serverIn({buffer, next, broadcast}) {
    if (!this._isHandshakeDone) {
      const frame = this.unpack(buffer);
      if (frame === null) {
        throw Error(`dropped unidentified packet ${buffer.length} bytes: ${buffer.toString('hex').substr(0, 60)}`);
      }
      const {ATYP, DSTADDR, DSTPORT, DATA} = frame;
      // notify to connect to the real server
      broadcast({
        type: SOCKET_CONNECT_TO_DST,
        payload: [
          new Address({ATYP, DSTADDR, DSTPORT}),
          () => { // once connected
            next(DATA);
            this._isHandshakeDone = true;
          }
        ]
      });
    } else {
      return buffer;
    }
  }

  serverOut({buffer}) {
    return buffer;
  }

  clientIn({buffer}) {
    return buffer;
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
      logger.debug(`invalid length: ${_buffer.length}`);
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
      //     logger.debug(`invalid length: ${_buffer.length}`);
      //     return null;
      //   }
      //   DSTADDR = _buffer.slice(2, 19);
      //   DSTPORT = _buffer.slice(19, 21);
      //   break;
      // }
      case ATYP_DOMAIN: {
        const domainLen = _buffer[1];
        if (_buffer.length < 4 + domainLen) {
          logger.debug(`invalid length: ${_buffer.length}`);
          return null;
        }
        DSTADDR = _buffer.slice(2, 2 + domainLen);
        DSTPORT = _buffer.slice(2 + domainLen, 4 + domainLen);
        break;
      }
      default:
        logger.debug(`unknown ATYP: ${_buffer[0]}`);
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
