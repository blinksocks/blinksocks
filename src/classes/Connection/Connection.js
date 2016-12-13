import {
  NOOP,
  ATYP_V4,
  ATYP_DOMAIN,
  ATYP_V6
} from '../../socks5/Constants';

export class Connection {

  ATYP;

  DSTADDR;

  DSTPORT;

  constructor(options = {}) {
    const fields = {
      ATYP: ATYP_V4,
      DSTADDR: [NOOP, NOOP, NOOP, NOOP],
      DSTPORT: [NOOP, NOOP],
      ...options
    };

    if (![ATYP_V4, ATYP_V6, ATYP_DOMAIN].includes(fields.ATYP)) {
      throw Error('ATYP should be ATYP_V4, ATYP_V6 or ATYP_DOMAIN');
    }

    if (!Array.isArray(fields.DSTADDR) && !(fields.DSTADDR instanceof Buffer)) {
      throw Error('DSTADDR must be Array or buffer');
    }

    if (fields.ATYP === ATYP_V4 && fields.DSTADDR.length !== 4) {
      throw Error('DSTADDR.length must be 4');
    }

    if (fields.ATYP === ATYP_V6 && fields.DSTADDR.length !== 16) {
      throw Error('DSTADDR.length must be 16');
    }

    if (!Array.isArray(fields.DSTPORT) && !(fields.DSTPORT instanceof Buffer)) {
      throw Error('DSTPORT must be Array or Buffer');
    }

    if (fields.DSTPORT.length !== 2) {
      throw Error('DSTPORT.length must be 2');
    }

    this.ATYP = fields.ATYP;
    this.DSTADDR = fields.DSTADDR;
    this.DSTPORT = fields.DSTPORT;
  }

  /**
   * convert DSTADDR and DSTPORT to String and Number
   * @returns {[*,*]}
   */
  getEndPoint() {
    const {ATYP, DSTADDR, DSTPORT} = this;

    let host = null;
    switch (ATYP) {
      case ATYP_V4:
        host = DSTADDR.join('.');
        break;
      case ATYP_V6: {
        const array = [];
        for (let i = 0; i < 8; ++i) {
          array.push(DSTADDR[i].toString(16) + DSTADDR[i + 1].toString(16));
        }
        host = array.join(':');
        break;
      }
      case ATYP_DOMAIN:
        host = DSTADDR.toString();
        break;
      default:
        throw Error(`unknown ATYP: ${ATYP}`);
    }
    const port = Buffer.from(DSTPORT).readUInt16BE(0);
    return [host, port];
  }

  toString() {
    return this.getEndPoint().join(':');
  }

}
