import {
  Message,
  NOOP,
  SOCKS_VERSION_V5,
  ATYP_V4,
  REPLY_UNASSIGNED
} from '../common';

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

  toBuffer() {
    return Buffer.from([
      this.VER, this.REP, this.RSV, this.ATYP,
      ...this.BNDADDR, ...this.BNDPORT
    ]);
  }

}
