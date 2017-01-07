import {Message} from '../common';
import {
  NOOP,
  ATYP_V4,
  ATYP_DOMAIN,
  ATYP_V6
} from './Constants';

// +----+------+------+----------+----------+----------+
// |RSV | FRAG | ATYP | DST.ADDR | DST.PORT |   DATA   |
// +----+------+------+----------+----------+----------+
// | 2  |  1   |  1   | Variable |    2     | Variable |
// +----+------+------+----------+----------+----------+

export class UdpRequestMessage extends Message {

  RSV;

  FRAG;

  ATYP;

  DSTADDR;

  DSTPORT;

  DATA;

  constructor(options) {
    super();
    const fields = {
      RSV: [NOOP, NOOP],
      FRAG: NOOP,
      ATYP: ATYP_V4,
      DSTADDR: [NOOP],
      DSTPORT: [NOOP, NOOP],
      DATA: [NOOP],
      ...options
    };
    this.RSV = fields.RSV;
    this.FRAG = fields.FRAG;
    this.ATYP = fields.ATYP;
    this.DSTADDR = fields.DSTADDR;
    this.DSTPORT = fields.DSTPORT;
    this.DATA = fields.DATA;
  }

  static parse(buffer) {
    if (buffer.length < 7) {
      return null;
    }

    if (buffer[0] !== NOOP || buffer[1] !== NOOP) {
      return null;
    }

    const addrTypes = [
      ATYP_V4,
      ATYP_DOMAIN,
      ATYP_V6
    ];

    if (!addrTypes.includes(buffer[3])) {
      return null;
    }

    let DSTADDR = null;
    let DSTPORT = null;
    switch (buffer[3]) {
      case ATYP_DOMAIN:
        DSTADDR = buffer.slice(5, 5 + buffer[4]);
        DSTPORT = buffer.slice(5 + buffer[4], 7 + buffer[4]);
        break;
      case ATYP_V6:
        DSTADDR = buffer.slice(4, 20);
        DSTPORT = buffer.slice(20, 22);
        break;
      default:
        // ATYP_V4
        DSTADDR = buffer.slice(4, 8);
        DSTPORT = buffer.slice(8, 10);
        break;
    }

    return new UdpRequestMessage({
      RSV: [NOOP, NOOP],
      FRAG: buffer[2],
      ATYP: buffer[3],
      DSTADDR,
      DSTPORT,
      DATA: buffer.slice(6 + DSTADDR.length)
    });
  }

}
