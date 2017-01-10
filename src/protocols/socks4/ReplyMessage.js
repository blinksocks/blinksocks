import {
  Message,
  NOOP,
  REPLY_GRANTED
} from '../common';

// +----+-----+----------+--------+
// |VER | CMD | DST.PORT | DST.IP |
// +----+-----+----------+--------+
// | 1  |  1  |    2     |    4   |
// +----+-----+----------+--------+

export class ReplyMessage extends Message {

  VER;

  CMD;

  DSTPORT;

  DSTIP;

  constructor(options) {
    super();
    const fields = {
      VER: NOOP, // NOTE: should be 0x00 according to RFC
      CMD: REPLY_GRANTED,
      DSTPORT: [NOOP, NOOP],
      DSTIP: [NOOP, NOOP, NOOP, NOOP],
      ...options
    };
    this.VER = fields.VER;
    this.CMD = fields.CMD;
    this.DSTPORT = fields.DSTPORT;
    this.DSTIP = fields.DSTIP;
  }

  toBuffer() {
    return Buffer.from([this.VER, this.CMD, ...this.DSTPORT, ...this.DSTIP]);
  }

}
