'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _ip = require('ip');

var _ip2 = _interopRequireDefault(_ip);

var _utils = require('../utils');

var _defs = require('./defs');

var _actions = require('./actions');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const ATYP_V4 = 0x01;
const ATYP_V6 = 0x04;
const ATYP_DOMAIN = 0x03;

function getHostType(host) {
  if (_net2.default.isIPv4(host)) {
    return ATYP_V4;
  }
  if (_net2.default.isIPv6(host)) {
    return ATYP_V6;
  }
  return ATYP_DOMAIN;
}

class SsBasePreset extends _defs.IPresetAddressing {
  constructor(...args) {
    var _temp;

    return _temp = super(...args), this._isConnecting = false, this._pending = Buffer.alloc(0), this._isHeaderSent = false, this._isHeaderRecv = false, this._atyp = ATYP_V4, this._host = null, this._port = null, this._headSize = 0, _temp;
  }

  get headSize() {
    return this._headSize;
  }

  onDestroy() {
    this._pending = null;
    this._host = null;
    this._port = null;
  }

  onNotified(action) {
    if (this._config.is_client && action.type === _actions.CONNECT_TO_REMOTE) {
      const { host, port } = action.payload;
      const type = getHostType(host);
      this._atyp = type;
      this._port = (0, _utils.numberToBuffer)(port);
      this._host = type === ATYP_DOMAIN ? Buffer.from(host) : _ip2.default.toBuffer(host);
    }
  }

  encodeHeader() {
    const head = Buffer.from([this._atyp, ...(this._atyp === ATYP_DOMAIN ? [this._host.length] : []), ...this._host, ...this._port]);
    this._headSize = head.length;
    return head;
  }

  decodeHeader({ buffer, fail }) {
    if (buffer.length < 7) {
      return fail(`invalid length: ${buffer.length}`);
    }
    const atyp = buffer[0];

    let addr;
    let port;
    let offset = 3;

    switch (atyp) {
      case ATYP_V4:
        addr = _ip2.default.toString(buffer.slice(1, 5));
        port = buffer.slice(5, 7).readUInt16BE(0);
        offset += 4;
        break;
      case ATYP_V6:
        if (buffer.length < 19) {
          return fail(`invalid length: ${buffer.length}`);
        }
        addr = _ip2.default.toString(buffer.slice(1, 17));
        port = buffer.slice(17, 19).readUInt16BE(0);
        offset += 16;
        break;
      case ATYP_DOMAIN:
        const domainLen = buffer[1];
        if (buffer.length < domainLen + 4) {
          return fail(`invalid length: ${buffer.length}`);
        }
        addr = buffer.slice(2, 2 + domainLen).toString();
        if (!(0, _utils.isValidHostname)(addr)) {
          return fail(`addr=${addr} is an invalid hostname`);
        }
        port = buffer.slice(2 + domainLen, 4 + domainLen).readUInt16BE(0);
        offset += domainLen + 1;
        break;
      default:
        return fail(`invalid atyp: ${atyp}`);
    }
    const data = buffer.slice(offset);
    return { host: addr, port, data };
  }

  clientOut({ buffer }) {
    if (!this._isHeaderSent) {
      this._isHeaderSent = true;
      return Buffer.concat([this.encodeHeader(), buffer]);
    } else {
      return buffer;
    }
  }

  serverIn({ buffer, next, broadcast, fail }) {
    if (!this._isHeaderRecv) {
      if (this._isConnecting) {
        this._pending = Buffer.concat([this._pending, buffer]);
        return;
      }

      const decoded = this.decodeHeader({ buffer, fail });
      if (!decoded) {
        return;
      }

      const { host, port, data } = decoded;

      this._isConnecting = true;
      broadcast({
        type: _actions.CONNECT_TO_REMOTE,
        payload: {
          host: host,
          port: port,

          onConnected: () => {
            if (this._pending !== null) {
              next(Buffer.concat([data, this._pending]));
            }
            this._isHeaderRecv = true;
            this._isConnecting = false;
            this._pending = null;
          }
        }
      });
    } else {
      return buffer;
    }
  }

  beforeOutUdp({ buffer }) {
    return Buffer.concat([this.encodeHeader(), buffer]);
  }

  serverInUdp({ buffer, next, broadcast, fail }) {
    const decoded = this.decodeHeader({ buffer, fail });
    if (!decoded) {
      return;
    }
    const { host, port, data } = decoded;
    this._atyp = getHostType(host);
    this._host = this._atyp === ATYP_DOMAIN ? Buffer.from(host) : _ip2.default.toBuffer(host);
    this._port = (0, _utils.numberToBuffer)(port);
    broadcast({
      type: _actions.CONNECT_TO_REMOTE,
      payload: {
        host: host,
        port: port,
        onConnected: () => next(data)
      }
    });
  }

}
exports.default = SsBasePreset;