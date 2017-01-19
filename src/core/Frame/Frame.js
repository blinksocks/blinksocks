import path from 'path';
import log4js from 'log4js';
import {Config} from '../Config';

import {
  NOOP,
  ATYP_V4,
  ATYP_V6,
  ATYP_DOMAIN
} from '../../proxies/common';

import {
  Message
} from '../../proxies/common';

const Logger = log4js.getLogger(path.basename(__filename, '.js'));

// +------+------+----------+----------+----------+
// | LEN  | ATYP | DST.ADDR | DST.PORT |   DATA   |
// +------+------+----------+----------+----------+
// |  2   |  1   | Variable |    2     | Variable |
// +------+------+----------+----------+----------+

export class Frame extends Message {

  LEN;

  ATYP;

  DSTADDR;

  DSTPORT;

  DATA;

  constructor(options = {}) {
    super();
    const fields = {
      LEN: [NOOP, NOOP],
      ATYP: ATYP_V4,
      DSTADDR: [NOOP, NOOP, NOOP, NOOP],
      DSTPORT: [NOOP, NOOP],
      DATA: [],
      ...options
    };
    this.LEN = fields.LEN;
    this.ATYP = fields.ATYP;
    this.DSTADDR = fields.DSTADDR;
    this.DSTPORT = fields.DSTPORT;
    this.DATA = fields.DATA;
  }

  // TODO: strict check the received buffer, for security
  static parse(buffer) {
    Logger.setLevel(Config.log_level);

    const _buffer = Buffer.from(buffer);

    if (_buffer.length < 9) {
      Logger.debug(`invalid length: ${_buffer.length}`);
      return null;
    }

    if (_buffer.length !== _buffer.readUInt16BE(0)) {
      Logger.debug(`invalid length: ${_buffer.length}, expect: ${_buffer.readUInt16BE(0)}`);
      return null;
    }

    let DSTADDR = null;
    let DSTPORT = null;
    switch (_buffer[2]) {
      case ATYP_V4: {
        DSTADDR = _buffer.slice(3, 7);
        DSTPORT = _buffer.slice(7, 9);
        break;
      }
      case ATYP_V6: {
        if (_buffer.length < 21) {
          Logger.debug(`invalid length: ${_buffer.length}`);
          return null;
        }
        DSTADDR = _buffer.slice(2, 19);
        DSTPORT = _buffer.slice(19, 21);
        break;
      }
      case ATYP_DOMAIN: {
        const domainLen = _buffer[3];
        if (_buffer.length < 6 + domainLen) {
          Logger.debug(`invalid length: ${_buffer.length}`);
          return null;
        }
        DSTADDR = _buffer.slice(4, 4 + _buffer[3]);
        DSTPORT = _buffer.slice(4 + _buffer[3], 6 + _buffer[3]);
        break;
      }
      default:
        Logger.debug(`unknown ATYP: ${_buffer[2]}`);
        return null;
    }

    return new Frame({
      LEN: _buffer.readUInt16BE(0),
      ATYP: _buffer[2],
      DSTADDR,
      DSTPORT,
      DATA: _buffer.slice(DSTADDR.length + (_buffer[2] === ATYP_DOMAIN ? 6 : 5))
    });
  }

  toBuffer() {
    return Buffer.from([...this.LEN, this.ATYP, ...this.DSTADDR, ...this.DSTPORT, ...this.DATA]);
  }

}
