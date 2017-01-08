import {Utils} from '../Utils';
import {Frame} from '../Frame';
import {
  ATYP_DOMAIN
} from '../../protocols';

export class Encapsulator {

  static pack(address, data) {
    const {ATYP, DSTADDR, DSTPORT} = address;

    let len = 3 + DSTADDR.length + DSTPORT.length + data.length;
    let addr = null;
    if (ATYP === ATYP_DOMAIN) {
      len += 1;
      addr = [DSTADDR.length, ...DSTADDR];
    } else {
      addr = DSTADDR;
    }

    return new Frame({
      LEN: Utils.numberToArray(len),
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
