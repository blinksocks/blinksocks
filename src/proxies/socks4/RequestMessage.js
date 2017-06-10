import {
  Message,
  NOOP,
  SOCKS_VERSION_V4,
  REQUEST_COMMAND_CONNECT,
  REQUEST_COMMAND_BIND
} from '../common';

// Socks4 version
// +----+-----+----------+--------+----------+--------+
// |VER | CMD | DST.PORT | DST.IP | USER.ID  |  NULL  |
// +----+-----+----------+--------+----------+--------+
// | 1  |  1  |    2     |    4   | Variable |  X'00' |
// +----+-----+----------+--------+----------+--------+

// Socks4a version
// +----+-----+----------+--------+----------+--------+------------+--------+
// |VER | CMD | DST.PORT | DST.IP | USER.ID  |  NULL  |  DST.ADDR  |  NULL  |
// +----+-----+----------+--------+----------+--------+------------+--------+
// | 1  |  1  |    2     |   4    | Variable |  X'00' |  Variable  |  X'00' |
// +----+-----+----------+--------+----------+--------+------------+--------+
//                        0.0.0.!0
export class RequestMessage extends Message {

  VER;

  CMD;

  DSTPORT;

  DSTIP;

  USERID;

  DSTADDR;

  constructor(options) {
    super();
    const fields = {
      VER: SOCKS_VERSION_V4,
      CMD: REQUEST_COMMAND_CONNECT,
      DSTPORT: [NOOP, NOOP],
      DSTIP: [NOOP, NOOP, NOOP, NOOP],
      USERID: [NOOP],
      DSTADDR: [NOOP],
      ...options
    };
    this.VER = fields.VER;
    this.CMD = fields.CMD;
    this.DSTPORT = fields.DSTPORT;
    this.DSTIP = fields.DSTIP;
    this.USERID = fields.USERID;
    this.DSTADDR = fields.DSTADDR;
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

    const DSTIP = buffer.slice(4, 8);
    let USERID = [];
    let DSTADDR = [];

    // Socks4a
    if (DSTIP[0] === NOOP && DSTIP[1] === NOOP && DSTIP[2] === NOOP && DSTIP[3] !== NOOP) {
      const rest = buffer.slice(8);
      const fields = [];
      let field = [];
      for (const byte of rest) {
        if (byte === NOOP) {
          fields.push(field);
          field = [];
        } else {
          field.push(byte);
        }
      }
      if (fields.length !== 2 || fields[1].length < 1) {
        return null;
      }
      USERID = fields[0];
      DSTADDR = Buffer.from(fields[1]);
    }

    return new RequestMessage({
      VER: buffer[0],
      CMD: buffer[1],
      DSTPORT: buffer.slice(2, 4),
      DSTIP,
      USERID,
      DSTADDR
    });
  }

}
