import {
  Message,
  NOOP,
  SOCKS_VERSION_V5,
  REQUEST_COMMAND_CONNECT,
  REQUEST_COMMAND_BIND,
  REQUEST_COMMAND_UDP,
  ATYP_V4,
  ATYP_DOMAIN,
  ATYP_V6
} from '../common';

// +----+-----+-------+------+----------+----------+
// |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
// +----+-----+-------+------+----------+----------+
// | 1  |  1  | X'00' |  1   | Variable |    2     |
// +----+-----+-------+------+----------+----------+

export class RequestMessage extends Message {

  VER;

  CMD;

  RSV;

  ATYP;

  DSTADDR; // Variable

  DSTPORT; // network octet order

  constructor(options) {
    super();
    const fields = {
      VER: SOCKS_VERSION_V5,
      CMD: REQUEST_COMMAND_CONNECT,
      RSV: NOOP,
      ATYP: ATYP_V4,
      DSTADDR: [NOOP],
      DSTPORT: [NOOP, NOOP],
      ...options
    };
    this.VER = fields.VER;
    this.CMD = fields.CMD;
    this.RSV = fields.RSV;
    this.ATYP = fields.ATYP;
    this.DSTADDR = fields.DSTADDR;
    this.DSTPORT = fields.DSTPORT;
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

    let DSTADDR = null;
    switch (buffer[3]) {
      case ATYP_DOMAIN:
        DSTADDR = buffer.slice(5, 5 + buffer[4]);
        break;
      case ATYP_V6:
        DSTADDR = buffer.slice(4, 20);
        break;
      default:
        // ATYP_V4
        DSTADDR = buffer.slice(4, 8);
        break;
    }

    return new RequestMessage({
      VER: buffer[0],
      CMD: buffer[1],
      RSV: buffer[2],
      ATYP: buffer[3],
      DSTADDR,
      DSTPORT: buffer.slice(-2)
    });
  }

}
