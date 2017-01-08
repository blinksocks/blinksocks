import {Message} from '../common';

// +-------------------------------------------+
// |  HTTP/1.1 200 Connection established\r\n  |
// |  \r\n                                     |
// +-------------------------------------------+
export class ConnectReplyMessage extends Message {

  VERSION;

  STATUS;

  PHRASE;

  constructor(options = {}) {
    super();
    const fields = {
      VERSION: Buffer.from('HTTP/1.1'),
      STATUS: Buffer.from('200'),
      PHRASE: Buffer.from('Connection established'),
      ...options
    };
    this.VERSION = fields.VERSION;
    this.STATUS = fields.STATUS;
    this.PHRASE = fields.PHRASE;
  }

  toBuffer() {
    return Buffer.from([
      ...this.VERSION, 0x20, ...this.STATUS, 0x20,
      ...this.PHRASE, 0x0d, 0x0a,
      0x0d, 0x0a
    ]);
  }

}
