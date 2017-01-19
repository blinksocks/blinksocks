import {
  Message,
  SOCKS_VERSION_V5,
  METHOD_NO_AUTH
} from '../common';

// +----+----------+----------+
// |VER | NMETHODS | METHODS  |
// +----+----------+----------+
// | 1  |    1     | 1 to 255 |
// +----+----------+----------+

export class IdentifierMessage extends Message {

  VER;

  NMETHODS;

  METHODS;

  constructor(options) {
    super();
    const fields = {
      VER: SOCKS_VERSION_V5,
      NMETHODS: 0x01,
      METHODS: [METHOD_NO_AUTH],
      ...options
    };
    this.VER = fields.VER;
    this.NMETHODS = fields.NMETHODS;
    this.METHODS = fields.METHODS;
  }

  static parse(buffer) {
    if (buffer.length < 3) {
      return null;
    }

    if (buffer[0] !== SOCKS_VERSION_V5) {
      return null;
    }

    if (buffer[1] < 1) {
      return null;
    }

    if (buffer.slice(2).length !== buffer[1]) {
      return null;
    }

    return new IdentifierMessage({
      VER: buffer[0],
      NMETHODS: buffer[1],
      METHODS: buffer.slice(2)
    });
  }

  toBuffer() {
    return Buffer.from([this.VER, this.NMETHODS, ...this.METHODS]);
  }

}
