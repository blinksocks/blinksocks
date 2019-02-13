"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _crypto = _interopRequireDefault(require("crypto"));

var _utils = require("../utils");

var _defs = require("./defs");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const HMAC_METHODS = {
  'md5': 16,
  'sha1': 20,
  'sha256': 32
};
const DEFAULT_HASH_METHOD = 'sha1';

class BaseAuthPreset extends _defs.IPresetAddressing {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "_hmacMethod", DEFAULT_HASH_METHOD);

    _defineProperty(this, "_hmacLen", null);

    _defineProperty(this, "_hmacKey", null);

    _defineProperty(this, "_cipher", null);

    _defineProperty(this, "_decipher", null);

    _defineProperty(this, "_isConnecting", false);

    _defineProperty(this, "_isHeaderSent", false);

    _defineProperty(this, "_isHeaderRecv", false);

    _defineProperty(this, "_pending", Buffer.alloc(0));

    _defineProperty(this, "_host", null);

    _defineProperty(this, "_port", null);
  }

  static onCheckParams({
    method = DEFAULT_HASH_METHOD
  }) {
    const methods = Object.keys(HMAC_METHODS);

    if (!methods.includes(method)) {
      throw Error(`base-auth 'method' must be one of [${methods}]`);
    }
  }

  onInit({
    method = DEFAULT_HASH_METHOD
  }) {
    const key = (0, _utils.EVP_BytesToKey)(this._config.key, 16, 16);
    const iv = (0, _utils.hash)('md5', Buffer.from(this._config.key + 'base-auth'));
    this._hmacMethod = method;
    this._hmacLen = HMAC_METHODS[method];
    this._hmacKey = key;

    if (this._config.is_client) {
      this._cipher = _crypto.default.createCipheriv('aes-128-cfb', key, iv);
    } else {
      this._decipher = _crypto.default.createDecipheriv('aes-128-cfb', key, iv);
    }
  }

  onInitTargetAddress({
    host,
    port
  }) {
    this._host = Buffer.from(host);
    this._port = (0, _utils.numberToBuffer)(port);
  }

  onDestroy() {
    this._cipher = null;
    this._decipher = null;
    this._pending = null;
    this._host = null;
    this._port = null;
  }

  encodeHeader() {
    const header = Buffer.concat([(0, _utils.numberToBuffer)(this._host.length, 1), this._host, this._port]);

    const encHeader = this._cipher.update(header);

    const mac = (0, _utils.hmac)(this._hmacMethod, this._hmacKey, encHeader);
    return Buffer.concat([encHeader, mac]);
  }

  decodeHeader({
    buffer,
    fail
  }) {
    const hmacLen = this._hmacLen;

    if (buffer.length < 31) {
      return fail(`length is too short: ${buffer.length}, dump=${(0, _utils.dumpHex)(buffer)}`);
    }

    const alen = this._decipher.update(buffer.slice(0, 1))[0];

    if (buffer.length <= 1 + alen + 2 + hmacLen) {
      return fail(`unexpected length: ${buffer.length}, dump=${(0, _utils.dumpHex)(buffer)}`);
    }

    const givenHmac = buffer.slice(1 + alen + 2, 1 + alen + 2 + hmacLen);
    const expHmac = (0, _utils.hmac)(this._hmacMethod, this._hmacKey, buffer.slice(0, 1 + alen + 2));

    if (!givenHmac.equals(expHmac)) {
      return fail(`unexpected HMAC=${(0, _utils.dumpHex)(givenHmac)} want=${(0, _utils.dumpHex)(expHmac)} dump=${(0, _utils.dumpHex)(buffer)}`);
    }

    const plaintext = this._decipher.update(buffer.slice(1, 1 + alen + 2));

    const addr = plaintext.slice(0, alen).toString();
    const port = plaintext.slice(alen, alen + 2).readUInt16BE(0);
    const data = buffer.slice(1 + alen + 2 + hmacLen);
    return {
      host: addr,
      port,
      data
    };
  }

  clientOut({
    buffer
  }) {
    if (!this._isHeaderSent) {
      this._isHeaderSent = true;
      return Buffer.concat([this.encodeHeader(), buffer]);
    } else {
      return buffer;
    }
  }

  serverIn({
    buffer,
    next,
    fail
  }) {
    if (!this._isHeaderRecv) {
      if (this._isConnecting) {
        this._pending = Buffer.concat([this._pending, buffer]);
        return;
      }

      const decoded = this.decodeHeader({
        buffer,
        fail
      });

      if (!decoded) {
        return;
      }

      const {
        host,
        port,
        data
      } = decoded;
      this._isConnecting = true;
      this.resolveTargetAddress({
        host,
        port
      }, () => {
        next(Buffer.concat([data, this._pending]));
        this._isHeaderRecv = true;
        this._isConnecting = false;
        this._pending = null;
      });
    } else {
      return buffer;
    }
  }

  clientOutUdp({
    buffer
  }) {
    return Buffer.concat([this.encodeHeader(), buffer]);
  }

  serverInUdp({
    buffer,
    next,
    fail
  }) {
    const decoded = this.decodeHeader({
      buffer,
      fail
    });

    if (!decoded) {
      return;
    }

    const {
      host,
      port,
      data
    } = decoded;
    this.resolveTargetAddress({
      host,
      port
    }, () => next(data));
  }

}

exports.default = BaseAuthPreset;