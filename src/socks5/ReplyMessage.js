import {Message} from '../common';
import {
  NOOP,
  SOCKS_VERSION_V5,
  REQUEST_COMMAND_CONNECT,
  REQUEST_COMMAND_BIND,
  REQUEST_COMMAND_UDP,
  ATYP_V4,
  ATYP_DOMAIN,
  ATYP_V6,
  REPLY_UNASSIGNED
} from './Constants';

// +----+-----+-------+------+----------+----------+
// |VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
// +----+-----+-------+------+----------+----------+
// | 1  |  1  | X'00' |  1   | Variable |    2     |
// +----+-----+-------+------+----------+----------+

export class ReplyMessage extends Message {

  VER;

  REP;

  RSV;

  ATYP;

  BNDADDR; // Variable

  BNDPORT; // network octet order

  constructor(options) {
    super();
    const fields = {
      VER: SOCKS_VERSION_V5,
      REP: REPLY_UNASSIGNED,
      RSV: NOOP,
      ATYP: ATYP_V4,
      BNDADDR: [NOOP, NOOP, NOOP, NOOP],
      BNDPORT: [NOOP, NOOP],
      ...options
    };
    this.VER = fields.VER;
    this.REP = fields.REP;
    this.RSV = fields.RSV;
    this.ATYP = fields.ATYP;
    this.BNDADDR = fields.BNDADDR;
    this.BNDPORT = fields.BNDPORT;
  }

  static parse(buffer) {
    if (buffer.length < 9) {
      return null;
    }

    if (buffer[0] !== SOCKS_VERSION_V5) {
      return null;
    }

    const reqTypes = [
      REQUEST_COMMAND_CONNECT,
      REQUEST_COMMAND_BIND,
      REQUEST_COMMAND_UDP
    ];

    if (!reqTypes.includes(buffer[1])) {
      return null;
    }

    if (buffer[2] !== NOOP) {
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

    return new ReplyMessage({
      VER: buffer[0],
      REP: buffer[1],
      RSV: buffer[2],
      ATYP: buffer[3],
      BNDADDR: buffer.slice(5, 5 + buffer[4]),
      BNDPORT: buffer.slice(-2)
    });
  }

  toBuffer() {
    return Buffer.from([
      this.VER, this.REP, this.RSV, this.ATYP,
      ...this.BNDADDR, ...this.BNDPORT
    ]);
  }

}
