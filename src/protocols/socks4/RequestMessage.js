import {
  Message,
  NOOP,
  SOCKS_VERSION_V4,
  REQUEST_COMMAND_CONNECT,
  REQUEST_COMMAND_BIND
} from '../common';

// +----+-----+----------+--------+----------+--------+
// |VER | CMD | DST.PORT | DST.IP | USER.ID  |  NULL  |
// +----+-----+----------+--------+----------+--------+
// | 1  |  1  |    2     |    4   | Variable |  X'00' |
// +----+-----+----------+--------+----------+--------+

export class RequestMessage extends Message {

  VER;

  CMD;

  DSTPORT;

  DSTIP;

  USERID;

  NULL;

  constructor(options) {
    super();
    const fields = {
      VER: SOCKS_VERSION_V4,
      CMD: REQUEST_COMMAND_CONNECT,
      DSTPORT: [NOOP, NOOP],
      DSTIP: [NOOP, NOOP, NOOP, NOOP],
      USERID: [NOOP],
      NULL: NOOP,
      ...options
    };
    this.VER = fields.VER;
    this.CMD = fields.CMD;
    this.DSTPORT = fields.DSTPORT;
    this.DSTIP = fields.DSTIP;
    this.USERID = fields.USERID;
    this.NULL = fields.NULL;
  }

  static parse(buffer) {
    if (buffer.length < 9) {
      return null;
    }

    if (buffer[0] !== SOCKS_VERSION_V4) {
      return null;
    }

    const reqTypes = [
      REQUEST_COMMAND_CONNECT,
      REQUEST_COMMAND_BIND
    ];

    if (!reqTypes.includes(buffer[1])) {
      return null;
    }

    if (buffer[buffer.length - 1] !== NOOP) {
      return null;
    }

    return new RequestMessage({
      VER: buffer[0],
      CMD: buffer[1],
      DSTPORT: buffer.slice(2, 4),
      DSTIP: buffer.slice(4, 8),
      USERID: buffer.slice(8, buffer.length - 1),
      NULL: NOOP
    });
  }

}
