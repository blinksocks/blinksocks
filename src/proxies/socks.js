import net from 'net';
import ip from 'ip';
import { logger, numberToBuffer, dumpHex } from '../utils';

// Socks4 Request Message
// +----+-----+----------+--------+----------+--------+
// |VER | CMD | DST.PORT | DST.IP | USER.ID  |  NULL  |
// +----+-----+----------+--------+----------+--------+
// | 1  |  1  |    2     |   4    | Variable |  X'00' |
// +----+-----+----------+--------+----------+--------+

// Socks4a Request Message
// +----+-----+----------+--------+----------+--------+------------+--------+
// |VER | CMD | DST.PORT | DST.IP | USER.ID  |  NULL  |  DST.ADDR  |  NULL  |
// +----+-----+----------+--------+----------+--------+------------+--------+
// | 1  |  1  |    2     |   4    | Variable |  X'00' |  Variable  |  X'00' |
// +----+-----+----------+--------+----------+--------+------------+--------+
//                        0.0.0.!0

// Socks4 Reply Message
// +----+-----+----------+--------+
// |VER | CMD | DST.PORT | DST.IP |
// +----+-----+----------+--------+
// | 1  |  1  |    2     |   4    |
// +----+-----+----------+--------+

// ------------------------------------------------------ //

// Socks5 Identifier Message
// +----+----------+----------+
// |VER | NMETHODS | METHODS  |
// +----+----------+----------+
// | 1  |    1     | 1 to 255 |
// +----+----------+----------+

// Socks5 Select Message
// +----+--------+
// |VER | METHOD |
// +----+--------+
// | 1  |   1    |
// +----+--------+

// Socks5 Initial negotiation(only when METHOD is 0x02)
// +----+------+----------+------+----------+
// |VER | ULEN |  UNAME   | PLEN |  PASSWD  |
// +----+------+----------+------+----------+
// | 1  |  1   | 1 to 255 |  1   | 1 to 255 |
// +----+------+----------+------+----------+

// Socks5 Request Message
// +----+-----+-------+------+----------+----------+
// |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
// +----+-----+-------+------+----------+----------+
// | 1  |  1  | X'00' |  1   | Variable |    2     |
// +----+-----+-------+------+----------+----------+

// Socks5 Reply Message
// +----+-----+-------+------+----------+----------+
// |VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
// +----+-----+-------+------+----------+----------+
// | 1  |  1  | X'00' |  1   | Variable |    2     |
// +----+-----+-------+------+----------+----------+

// Socks5 UDP Request/Response
// +----+------+------+----------+----------+----------+
// |RSV | FRAG | ATYP | DST.ADDR | DST.PORT |   DATA   |
// +----+------+------+----------+----------+----------+
// | 2  |  1   |  1   | Variable |    2     | Variable |
// +----+------+------+----------+----------+----------+

const NOOP = 0x00;
const SOCKS_VERSION_V4 = 0x04;
const SOCKS_VERSION_V5 = 0x05;
const METHOD_NO_AUTH = 0x00;
const METHOD_USERNAME_PASSWORD = 0x02;
const METHOD_NOT_ACCEPTABLE = 0xff;

const REQUEST_COMMAND_CONNECT = 0x01;
const REQUEST_COMMAND_BIND = 0x02;
const REQUEST_COMMAND_UDP = 0x03;

const ATYP_V4 = 0x01;
const ATYP_DOMAIN = 0x03;
const ATYP_V6 = 0x04;

const REPLY_GRANTED = 0x5a;
const REPLY_SUCCEEDED = 0x00;
// const REPLY_FAILURE = 0x01;
// const REPLY_NOT_ALLOWED = 0x02;
// const REPLY_NETWORK_UNREACHABLE = 0x03;
// const REPLY_HOST_UNREACHABLE = 0x04;
// const REPLY_CONNECTION_REFUSED = 0x05;
// const REPLY_TTL_EXPIRED = 0x06;
const REPLY_COMMAND_NOT_SUPPORTED = 0x07;
// const REPLY_ADDRESS_TYPE_NOT_SUPPORTED = 0x08;
// const REPLY_UNASSIGNED = 0xff;

function getHostType(host) {
  if (net.isIPv4(host)) {
    return ATYP_V4;
  }
  if (net.isIPv6(host)) {
    return ATYP_V6;
  }
  return ATYP_DOMAIN;
}

function parseSocks5Identifier(buffer) {
  if (buffer.length < 3) {
    return null;
  }
  if (buffer[0] !== SOCKS_VERSION_V5) {
    return null;
  }
  if (buffer[1] < 1) {
    return null;
  }
  if (buffer.length - 2 !== buffer[1]) {
    return null;
  }
  let method = METHOD_NO_AUTH;
  for (let i = 2; i <= 2 + buffer[1]; ++i) {
    if (buffer[i] === METHOD_USERNAME_PASSWORD) {
      method = METHOD_USERNAME_PASSWORD;
      break;
    }
  }
  return { method };
}

function parseSocks5InitialNegotiation(buffer) {
  if (buffer.length < 3) {
    return null;
  }
  // if (buffer[0] !== SOCKS_VERSION_V5) {
  //   return null;
  // }
  const ulen = buffer[1];
  if (buffer.length < ulen + 2) {
    return null;
  }
  const uname = buffer.slice(2, 2 + ulen);
  const plen = buffer[2 + ulen];
  if (buffer.length !== 3 + ulen + plen) {
    return null;
  }
  const passwd = buffer.slice(-plen);
  return {
    username: uname.toString(),
    password: passwd.toString(),
  };
}

function parseSocks5Request(buffer) {
  if (buffer.length < 10) {
    return null;
  }
  if (buffer[0] !== SOCKS_VERSION_V5) {
    return null;
  }
  if (![REQUEST_COMMAND_CONNECT, REQUEST_COMMAND_BIND, REQUEST_COMMAND_UDP].includes(buffer[1])) {
    return null;
  }
  if (buffer[2] !== NOOP) {
    return null;
  }
  if (![ATYP_V4, ATYP_DOMAIN, ATYP_V6].includes(buffer[3])) {
    return null;
  }
  let addr = null;
  switch (buffer[3]) {
    case ATYP_V4:
      addr = ip.toString(buffer.slice(4, 8));
      break;
    case ATYP_DOMAIN:
      addr = buffer.slice(5, 5 + buffer[4]).toString();
      break;
    case ATYP_V6:
      addr = ip.toString(buffer.slice(4, 20));
      break;
    default:
      break;
  }
  const port = buffer.slice(-2).readUInt16BE(0);
  return { host: addr, port: port };
}

function parseSocks5UdpRequest(buffer) {
  if (buffer.length < 10) {
    return null;
  }
  if (buffer[0] !== 0x00 || buffer[1] !== 0x00) {
    return null;
  }
  const frag = buffer[2];
  if (frag !== 0x00) {
    return null; // doesn't support fragment
  }
  let addr = null;
  let pos = 4;
  switch (buffer[3]) {
    case ATYP_V4:
      addr = ip.toString(buffer.slice(4, 8));
      pos = pos + 4;
      break;
    case ATYP_DOMAIN:
      addr = buffer.slice(5, 5 + buffer[4]).toString();
      pos = pos + 1 + buffer[4];
      break;
    case ATYP_V6:
      addr = ip.toString(buffer.slice(4, 20));
      pos = pos + 16;
      break;
    default:
      break;
  }
  const port = buffer.slice(pos, pos + 2).readUInt16BE(0);
  const data = buffer.slice(pos + 2);
  return { host: addr, port: port, data: data };
}

function parseSocks4Request(buffer) {
  if (buffer.length < 9) {
    return null;
  }
  if (buffer[0] !== SOCKS_VERSION_V4) {
    return null;
  }
  if (![REQUEST_COMMAND_CONNECT, REQUEST_COMMAND_BIND].includes(buffer[1])) {
    return null;
  }
  if (buffer[buffer.length - 1] !== NOOP) {
    return null;
  }

  const DSTIP = buffer.slice(4, 8);
  const DSTPORT = buffer.slice(2, 4);

  let DSTADDR = [];

  const isSocks4a =
    DSTIP[0] === NOOP &&
    DSTIP[1] === NOOP &&
    DSTIP[2] === NOOP &&
    DSTIP[3] !== NOOP;

  // Socks4a
  if (isSocks4a) {
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
    DSTADDR = Buffer.from(fields[1]);
  }

  return {
    host: isSocks4a ? DSTADDR.toString() : ip.toString(DSTIP),
    port: DSTPORT.readUInt16BE(0)
  };
}

function encodeSocks5UdpResponse({ host, port, data }) {
  const atyp = getHostType(host);
  const _host = atyp === ATYP_DOMAIN ? Buffer.from(host) : ip.toBuffer(host);
  const _port = numberToBuffer(port);
  return Buffer.from([
    0x00, 0x00, 0x00, atyp,
    ...(atyp === ATYP_DOMAIN ? [_host.length] : []),
    ..._host, ..._port, ...data
  ]);
}

const STAGE_INIT = 0;
const STAGE_SOCKS5_REQUEST_MESSAGE = 1;
const STAGE_SOCKS5_INITIAL_NEGOTIATION_MESSAGE = 2;
const STAGE_DONE = 3;

export function createServer({ bindAddress, bindPort, username, password }) {
  const server = net.createServer();
  const isAuthRequired = username !== '' && password !== '';

  server.on('connection', (socket) => {
    const appAddress = `${socket.remoteAddress}:${socket.remotePort}`;

    let stage = STAGE_INIT;

    function removeSocksListeners() {
      socket.removeListener('data', onMessage);
      socket.removeListener('error', onError);
    }

    function onMessage(buffer) {
      let request;

      if (stage === STAGE_INIT) {
        // try socks5
        request = parseSocks5Identifier(buffer);
        if (request !== null) {
          const { method } = request;
          switch (method) {
            case METHOD_NO_AUTH:
              if (isAuthRequired) {
                logger.error(`[socks] [${appAddress}] server requires authorization but got METHOD_NO_AUTH`);
                socket.end(Buffer.from([SOCKS_VERSION_V5, METHOD_NOT_ACCEPTABLE]));
                break;
              }
              stage = STAGE_SOCKS5_REQUEST_MESSAGE;
              // Socks5 Select Message
              socket.write(Buffer.from([SOCKS_VERSION_V5, METHOD_NO_AUTH]));
              break;
            case METHOD_USERNAME_PASSWORD:
              stage = STAGE_SOCKS5_INITIAL_NEGOTIATION_MESSAGE;
              // Socks5 Initial negotiation
              socket.write(Buffer.from([SOCKS_VERSION_V5, METHOD_USERNAME_PASSWORD]));
              break;
            default:
              logger.error(`[socks] [${appAddress}] unsupported socks5 identifier method: ${method}`);
              socket.end(Buffer.from([SOCKS_VERSION_V5, METHOD_NOT_ACCEPTABLE]));
              break;
          }
          return;
        }
        // try socks4(a)
        request = parseSocks4Request(buffer);
        if (request !== null) {
          stage = STAGE_DONE;
          const { host, port } = request;
          server.emit('proxyConnection', socket, {
            host: host,
            port: port,
            onConnected: () => {
              // Socks4 Reply Message
              socket.write(Buffer.from([NOOP, REPLY_GRANTED, NOOP, NOOP, NOOP, NOOP, NOOP, NOOP]));
            }
          });
          removeSocksListeners();
          return;
        }
        logger.error(`[socks] [${appAddress}] invalid socks handshake message: ${dumpHex(buffer)}`);
        socket.destroy();
      }
      else if (stage === STAGE_SOCKS5_INITIAL_NEGOTIATION_MESSAGE) {
        request = parseSocks5InitialNegotiation(buffer);
        if (request !== null) {
          // Username/Password Authentication
          if (isAuthRequired) {
            if (username !== request.username || password !== request.password) {
              logger.error(`[socks] [${appAddress}] invalid socks5 authorization username/password, dump=${dumpHex(buffer)}`);
              socket.end(Buffer.from([SOCKS_VERSION_V5, 0x01]));
              return;
            }
          }
          stage = STAGE_SOCKS5_REQUEST_MESSAGE;
          socket.write(Buffer.from([SOCKS_VERSION_V5, 0x00]));
        } else {
          logger.error(`[socks] [${appAddress}] invalid socks5 initial negotiation message: ${dumpHex(buffer)}`);
          socket.end(Buffer.from([SOCKS_VERSION_V5, 0x01]));
        }
      }
      else if (stage === STAGE_SOCKS5_REQUEST_MESSAGE) {
        request = parseSocks5Request(buffer);
        if (request !== null) {
          stage = STAGE_DONE;
          const cmd = buffer[1];
          switch (cmd) {
            // UDP ASSOCIATE
            case REQUEST_COMMAND_UDP: {
              const atyp = getHostType(bindAddress);
              const addr = atyp === ATYP_DOMAIN ? Buffer.from(bindAddress) : ip.toBuffer(bindAddress);
              const port = numberToBuffer(bindPort);
              // Socks5 Reply Message
              socket.write(Buffer.from([
                SOCKS_VERSION_V5, REPLY_SUCCEEDED, NOOP,
                atyp, ...(atyp === ATYP_DOMAIN ? [addr.length] : []), ...addr, ...port
              ]));
              socket.removeListener('data', onMessage);
              break;
            }
            case REQUEST_COMMAND_CONNECT: {
              const { host, port } = request;
              server.emit('proxyConnection', socket, {
                host: host,
                port: port,
                onConnected: () => {
                  // Socks5 Reply Message
                  socket.write(Buffer.from([
                    SOCKS_VERSION_V5, REPLY_SUCCEEDED, NOOP,
                    ATYP_V4, NOOP, NOOP, NOOP, NOOP, NOOP, NOOP
                  ]));
                }
              });
              removeSocksListeners();
              break;
            }
            default: {
              // Socks5 Reply Message
              socket.write(Buffer.from([
                SOCKS_VERSION_V5, REPLY_COMMAND_NOT_SUPPORTED, NOOP,
                ATYP_V4, NOOP, NOOP, NOOP, NOOP, NOOP, NOOP
              ]));
              break;
            }
          }
        } else {
          logger.error(`[socks] [${appAddress}] invalid socks5 request message: ${dumpHex(buffer)}`);
          socket.destroy();
        }
      }
    }

    function onError(err) {
      logger.warn(`[socks] [${appAddress}] ${err.message}`);
    }

    socket.on('data', onMessage);
    socket.on('error', onError);
  });

  return server;
}

export { parseSocks5UdpRequest, encodeSocks5UdpResponse };
