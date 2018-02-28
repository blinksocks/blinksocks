'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _utils = require('../utils');

var _defs = require('./defs');

var _actions = require('./actions');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const HMAC_METHODS = {
  'md5': 16, 'sha1': 20, 'sha256': 32
};

const DEFAULT_HASH_METHOD = 'sha1';

class BaseAuthPreset extends _defs.IPresetAddressing {
  constructor(...args) {
    var _temp;

    return _temp = super(...args), this._hmacMethod = DEFAULT_HASH_METHOD, this._hmacLen = null, this._hmacKey = null, this._cipher = null, this._decipher = null, this._isConnecting = false, this._isHeaderSent = false, this._isHeaderRecv = false, this._pending = Buffer.alloc(0), this._host = null, this._port = null, _temp;
  }

  static onCheckParams({ method = DEFAULT_HASH_METHOD }) {
    const methods = Object.keys(HMAC_METHODS);
    if (!methods.includes(method)) {
      throw Error(`base-auth 'method' must be one of [${methods}]`);
    }
  }

  onInit({ method = DEFAULT_HASH_METHOD }) {
    const key = (0, _utils.EVP_BytesToKey)(this._config.key, 16, 16);
    const iv = (0, _utils.hash)('md5', Buffer.from(this._config.key + 'base-auth'));
    this._hmacMethod = method;
    this._hmacLen = HMAC_METHODS[method];
    this._hmacKey = key;
    if (this._config.is_client) {
      this._cipher = _crypto2.default.createCipheriv('aes-128-cfb', key, iv);
    } else {
      this._decipher = _crypto2.default.createDecipheriv('aes-128-cfb', key, iv);
    }
  }

  onDestroy() {
    this._cipher = null;
    this._decipher = null;
    this._pending = null;
    this._host = null;
    this._port = null;
  }

  onNotified(action) {
    if (this._config.is_client && action.type === _actions.CONNECT_TO_REMOTE) {
      const { host, port } = action.payload;
      this._host = Buffer.from(host);
      this._port = (0, _utils.numberToBuffer)(port);
    }
  }

  encodeHeader() {
    const header = Buffer.concat([(0, _utils.numberToBuffer)(this._host.length, 1), this._host, this._port]);
    const encHeader = this._cipher.update(header);
    const mac = (0, _utils.hmac)(this._hmacMethod, this._hmacKey, encHeader);
    return Buffer.concat([encHeader, mac]);
  }

  decodeHeader({ buffer, fail }) {
    const hmacLen = this._hmacLen;

    if (buffer.length < 31) {
      return fail(`length is too short: ${buffer.length}, dump=${buffer.toString('hex')}`);
    }

    const alen = this._decipher.update(buffer.slice(0, 1))[0];
    if (buffer.length <= 1 + alen + 2 + hmacLen) {
      return fail(`unexpected length: ${buffer.length}, dump=${buffer.toString('hex')}`);
    }

    const givenHmac = buffer.slice(1 + alen + 2, 1 + alen + 2 + hmacLen);
    const expHmac = (0, _utils.hmac)(this._hmacMethod, this._hmacKey, buffer.slice(0, 1 + alen + 2));
    if (!givenHmac.equals(expHmac)) {
      return fail(`unexpected HMAC=${givenHmac.toString('hex')} want=${expHmac.toString('hex')} dump=${buffer.slice(0, 60).toString('hex')}`);
    }

    const plaintext = this._decipher.update(buffer.slice(1, 1 + alen + 2));

    const addr = plaintext.slice(0, alen).toString();
    const port = plaintext.slice(alen, alen + 2).readUInt16BE(0);
    const data = buffer.slice(1 + alen + 2 + hmacLen);

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
            next(Buffer.concat([data, this._pending]));
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

  clientOutUdp({ buffer }) {
    return Buffer.concat([this.encodeHeader(), buffer]);
  }

  serverInUdp({ buffer, next, broadcast, fail }) {
    const decoded = this.decodeHeader({ buffer, fail });
    if (!decoded) {
      return;
    }
    const { host, port, data } = decoded;
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
exports.default = BaseAuthPreset;