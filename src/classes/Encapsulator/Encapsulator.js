import {Frame} from '../Frame';
import {
  ATYP_DOMAIN
} from '../../socks5/Constants';

export class Encapsulator {

  /**
   * convert a number to byte array
   * @example
   *   numberToArray(257); // [0x01, 0x01]
   * @param num
   * @param minSize
   * @returns {Array.<*>}
   */
  static numberToArray(num, minSize = 2) {
    let arr = [];
    do {
      arr.push(num & 0xff);
      num >>= 8;
    } while (num > 0);
    if (arr.length < minSize) {
      const padding = [];
      for (let i = 0, len = minSize - arr.length; i < len; ++i) {
        padding.push(0x00);
      }
      arr = [...arr, ...padding];
    }
    return arr.reverse();
  }

  static pack(connection, data) {
    const {ATYP, DSTADDR, DSTPORT} = connection;

    let len = 3 + DSTADDR.length + DSTPORT.length + data.length;
    let addr = null;
    if (ATYP === ATYP_DOMAIN) {
      len += 1;
      addr = [DSTADDR.length, ...DSTADDR];
    } else {
      addr = DSTADDR;
    }

    return new Frame({
      LEN: Encapsulator.numberToArray(len),
      ATYP,
      DSTADDR: addr,
      DSTPORT,
      DATA: data
    });
  }

  static unpack(buffer) {
    return Frame.parse(buffer);
  }

}
