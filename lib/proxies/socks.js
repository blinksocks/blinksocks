'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeSocks5UdpResponse = exports.parseSocks5UdpRequest = undefined;
exports.createServer = createServer;

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _ip = require('ip');

var _ip2 = _interopRequireDefault(_ip);

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const NOOP = 0x00;
const SOCKS_VERSION_V4 = 0x04;
const SOCKS_VERSION_V5 = 0x05;
const METHOD_NO_AUTH = 0x00;

const REQUEST_COMMAND_CONNECT = 0x01;
const REQUEST_COMMAND_BIND = 0x02;
const REQUEST_COMMAND_UDP = 0x03;

const ATYP_V4 = 0x01;
const ATYP_DOMAIN = 0x03;
const ATYP_V6 = 0x04;

const REPLY_GRANTED = 0x5a;
const REPLY_SUCCEEDED = 0x00;

const REPLY_COMMAND_NOT_SUPPORTED = 0x07;


function getHostType(host) {
  if (_net2.default.isIPv4(host)) {
    return ATYP_V4;
  }
  if (_net2.default.isIPv6(host)) {
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
  if (buffer.slice(2).length !== buffer[1]) {
    return null;
  }
  return true;
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
      addr = _ip2.default.toString(buffer.slice(4, 8));
      break;
    case ATYP_DOMAIN:
      addr = buffer.slice(5, 5 + buffer[4]).toString();
      break;
    case ATYP_V6:
      addr = _ip2.default.toString(buffer.slice(4, 20));
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
    return null;
  }
  let addr = null;
  let pos = 4;
  switch (buffer[3]) {
    case ATYP_V4:
      addr = _ip2.default.toString(buffer.slice(4, 8));
      pos = pos + 4;
      break;
    case ATYP_DOMAIN:
      addr = buffer.slice(5, 5 + buffer[4]).toString();
      pos = pos + 1 + buffer[4];
      break;
    case ATYP_V6:
      addr = _ip2.default.toString(buffer.slice(4, 20));
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

  const isSocks4a = DSTIP[0] === NOOP && DSTIP[1] === NOOP && DSTIP[2] === NOOP && DSTIP[3] !== NOOP;

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
    host: isSocks4a ? DSTADDR.toString() : _ip2.default.toString(DSTIP),
    port: DSTPORT.readUInt16BE(0)
  };
}

function encodeSocks5UdpResponse({ host, port, data }) {
  const atyp = getHostType(host);
  const _host = atyp === ATYP_DOMAIN ? Buffer.from(host) : _ip2.default.toBuffer(host);
  const _port = (0, _utils.numberToBuffer)(port);
  return Buffer.from([0x00, 0x00, 0x00, atyp, ...(atyp === ATYP_DOMAIN ? [_host.length] : []), ..._host, ..._port, ...data]);
}

const STAGE_INIT = 0;
const STAGE_SOCKS5_REQUEST_MESSAGE = 1;
const STAGE_DONE = 2;

function createServer({ bindAddress, bindPort }) {
  const server = _net2.default.createServer();

  server.on('connection', socket => {
    const appAddress = `${socket.remoteAddress}:${socket.remotePort}`;

    let stage = STAGE_INIT;

    function removeSocksListeners() {
      socket.removeListener('data', onMessage);
      socket.removeListener('error', onError);
    }

    function onMessage(buffer) {
      let request;

      if (stage === STAGE_INIT) {
        request = parseSocks5Identifier(buffer);
        if (request !== null) {
          stage = STAGE_SOCKS5_REQUEST_MESSAGE;

          socket.write(Buffer.from([SOCKS_VERSION_V5, METHOD_NO_AUTH]));
          return;
        }

        request = parseSocks4Request(buffer);
        if (request !== null) {
          stage = STAGE_DONE;
          const { host, port } = request;
          server.emit('proxyConnection', socket, {
            host: host,
            port: port,
            onConnected: () => {
              socket.write(Buffer.from([NOOP, REPLY_GRANTED, NOOP, NOOP, NOOP, NOOP, NOOP, NOOP]));
            }
          });
          removeSocksListeners();
          return;
        }
        _utils.logger.error(`[socks] [${appAddress}] invalid socks handshake message: ${buffer.slice(0, 60).toString('hex')}`);
        socket.destroy();
      } else if (stage === STAGE_SOCKS5_REQUEST_MESSAGE) {
        request = parseSocks5Request(buffer);
        if (request !== null) {
          stage = STAGE_DONE;
          const cmd = buffer[1];
          switch (cmd) {
            case REQUEST_COMMAND_UDP:
              {
                const atyp = getHostType(bindAddress);
                const addr = atyp === ATYP_DOMAIN ? Buffer.from(bindAddress) : _ip2.default.toBuffer(bindAddress);
                const port = (0, _utils.numberToBuffer)(bindPort);

                socket.write(Buffer.from([SOCKS_VERSION_V5, REPLY_SUCCEEDED, NOOP, atyp, ...(atyp === ATYP_DOMAIN ? [addr.length] : []), ...addr, ...port]));
                socket.removeListener('data', onMessage);
                break;
              }
            case REQUEST_COMMAND_CONNECT:
              {
                const { host, port } = request;
                server.emit('proxyConnection', socket, {
                  host: host,
                  port: port,
                  onConnected: () => {
                    socket.write(Buffer.from([SOCKS_VERSION_V5, REPLY_SUCCEEDED, NOOP, ATYP_V4, NOOP, NOOP, NOOP, NOOP, NOOP, NOOP]));
                  }
                });
                removeSocksListeners();
                break;
              }
            default:
              {
                socket.write(Buffer.from([SOCKS_VERSION_V5, REPLY_COMMAND_NOT_SUPPORTED, NOOP, ATYP_V4, NOOP, NOOP, NOOP, NOOP, NOOP, NOOP]));
                break;
              }
          }
        } else {
          _utils.logger.error(`[socks] [${appAddress}] invalid socks5 request message: ${buffer.slice(0, 60).toString('hex')}`);
          socket.destroy();
        }
      }
    }

    function onError(err) {
      _utils.logger.warn(`[socks] [${appAddress}] ${err.message}`);
    }

    socket.on('data', onMessage);
    socket.on('error', onError);
  });

  return server;
}

exports.parseSocks5UdpRequest = parseSocks5UdpRequest;
exports.encodeSocks5UdpResponse = encodeSocks5UdpResponse;