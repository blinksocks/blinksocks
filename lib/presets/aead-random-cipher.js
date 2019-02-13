"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _crypto = _interopRequireDefault(require("crypto"));

var _defs = require("./defs");

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const NONCE_LEN = 12;
const TAG_LEN = 16;
const MIN_CHUNK_LEN = TAG_LEN * 2 + 3;
const MIN_CHUNK_SPLIT_LEN = 0x0800;
const MAX_CHUNK_SPLIT_LEN = 0x3FFF;
const DEFAULT_INFO = 'bs-subkey';
const DEFAULT_FACTOR = 2;
const ciphers = {
  'aes-128-gcm': 16,
  'aes-192-gcm': 24,
  'aes-256-gcm': 32
};
const HKDF_HASH_ALGORITHM = 'sha1';

class AeadRandomCipherPreset extends _defs.IPreset {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "_cipherName", '');

    _defineProperty(this, "_info", null);

    _defineProperty(this, "_factor", DEFAULT_FACTOR);

    _defineProperty(this, "_rawKey", null);

    _defineProperty(this, "_keySaltSize", 0);

    _defineProperty(this, "_cipherKey", null);

    _defineProperty(this, "_decipherKey", null);

    _defineProperty(this, "_cipherNonce", null);

    _defineProperty(this, "_decipherNonce", null);

    _defineProperty(this, "_nextExpectDecipherNonce", null);

    _defineProperty(this, "_adBuf", null);
  }

  static onCheckParams({
    method,
    info = DEFAULT_INFO,
    factor = DEFAULT_FACTOR
  }) {
    if (method === undefined || method === '') {
      throw Error('\'method\' must be set');
    }

    const cipherNames = Object.keys(ciphers);

    if (!cipherNames.includes(method)) {
      throw Error(`'method' must be one of [${cipherNames}]`);
    }

    if (typeof info !== 'string' || info.length <= 0) {
      throw Error('\'info\' must be a non-empty string');
    }

    if (!Number.isInteger(factor)) {
      throw Error('\'factor\' must be an integer');
    }

    if (factor < 1 || factor > 10) {
      throw Error('\'factor\' must be in [1, 10]');
    }
  }

  onInit({
    method,
    info = DEFAULT_INFO,
    factor = DEFAULT_FACTOR
  }) {
    this._cipherName = method;
    this._info = Buffer.from(info);
    this._factor = factor;
    this._rawKey = Buffer.from(this._config.key);
    this._keySaltSize = ciphers[method];
    this._adBuf = new _utils.AdvancedBuffer({
      getPacketLength: this.onReceiving.bind(this)
    });

    this._adBuf.on('data', this.onChunkReceived.bind(this));

    this._cipherNonce = Buffer.alloc(NONCE_LEN);
    this._decipherNonce = Buffer.alloc(NONCE_LEN);
    this._nextExpectDecipherNonce = Buffer.alloc(NONCE_LEN);
  }

  onDestroy() {
    this._adBuf.clear();

    this._adBuf = null;
    this._cipherKey = null;
    this._decipherKey = null;
    this._cipherNonce = null;
    this._decipherNonce = null;
    this._nextExpectDecipherNonce = null;
  }

  beforeOut({
    buffer
  }) {
    let salt = null;

    if (this._cipherKey === null) {
      const size = this._keySaltSize;
      salt = _crypto.default.randomBytes(size);
      this._cipherKey = (0, _utils.HKDF)(HKDF_HASH_ALGORITHM, salt, this._rawKey, this._info, size);
    }

    const chunks = (0, _utils.getRandomChunks)(buffer, MIN_CHUNK_SPLIT_LEN, MAX_CHUNK_SPLIT_LEN).map(chunk => {
      const paddingLen = this.getPaddingLength(this._cipherKey, this._cipherNonce);

      const padding = _crypto.default.randomBytes(paddingLen);

      const dataLen = (0, _utils.numberToBuffer)(chunk.length);
      const [encLen, lenTag] = this.encrypt(dataLen);
      const [encData, dataTag] = this.encrypt(chunk);
      return Buffer.concat([padding, encLen, lenTag, encData, dataTag]);
    });

    if (salt) {
      return Buffer.concat([salt, ...chunks]);
    } else {
      return Buffer.concat(chunks);
    }
  }

  beforeIn({
    buffer,
    next,
    fail
  }) {
    this._adBuf.put(buffer, {
      next,
      fail
    });
  }

  onReceiving(buffer, {
    fail
  }) {
    if (this._decipherKey === null) {
      const size = this._keySaltSize;

      if (buffer.length < size) {
        return;
      }

      const salt = buffer.slice(0, size);
      this._decipherKey = (0, _utils.HKDF)(HKDF_HASH_ALGORITHM, salt, this._rawKey, this._info, size);
      return buffer.slice(size);
    }

    if (this._decipherNonce.equals(this._nextExpectDecipherNonce)) {
      const paddingLen = this.getPaddingLength(this._decipherKey, this._decipherNonce);

      if (buffer.length < paddingLen) {
        return;
      }

      (0, _utils.incrementLE)(this._nextExpectDecipherNonce);
      (0, _utils.incrementLE)(this._nextExpectDecipherNonce);
      return buffer.slice(paddingLen);
    }

    if (buffer.length < MIN_CHUNK_LEN) {
      return;
    }

    const [encLen, lenTag] = [buffer.slice(0, 2), buffer.slice(2, 2 + TAG_LEN)];
    const dataLenBuf = this.decrypt(encLen, lenTag);

    if (dataLenBuf === null) {
      fail(`unexpected DataLen_TAG=${lenTag.toString('hex')} when verify DataLen=${encLen.toString('hex')}, dump=${buffer.slice(0, 60).toString('hex')}`);
      return -1;
    }

    const dataLen = dataLenBuf.readUInt16BE(0);

    if (dataLen > MAX_CHUNK_SPLIT_LEN) {
      fail(`invalid DataLen=${dataLen} is over ${MAX_CHUNK_SPLIT_LEN}, dump=${buffer.slice(0, 60).toString('hex')}`);
      return -1;
    }

    return 2 + TAG_LEN + dataLen + TAG_LEN;
  }

  onChunkReceived(chunk, {
    next,
    fail
  }) {
    const [encData, dataTag] = [chunk.slice(2 + TAG_LEN, -TAG_LEN), chunk.slice(-TAG_LEN)];
    const data = this.decrypt(encData, dataTag);

    if (data === null) {
      fail(`unexpected Data_TAG=${dataTag.toString('hex')} when verify Data=${encData.slice(0, 60).toString('hex')}, dump=${chunk.slice(0, 60).toString('hex')}`);
      return;
    }

    next(data);
  }

  getPaddingLength(key, nonce) {
    const cipher = _crypto.default.createCipheriv(this._cipherName, key, nonce);

    cipher.update(nonce);
    cipher.final();
    return cipher.getAuthTag()[0] * this._factor;
  }

  encrypt(message) {
    const cipher = _crypto.default.createCipheriv(this._cipherName, this._cipherKey, this._cipherNonce);

    const encrypted = Buffer.concat([cipher.update(message), cipher.final()]);
    const tag = cipher.getAuthTag();
    (0, _utils.incrementLE)(this._cipherNonce);
    return [encrypted, tag];
  }

  decrypt(ciphertext, tag) {
    const decipher = _crypto.default.createDecipheriv(this._cipherName, this._decipherKey, this._decipherNonce);

    decipher.setAuthTag(tag);

    try {
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      (0, _utils.incrementLE)(this._decipherNonce);
      return decrypted;
    } catch (err) {
      return null;
    }
  }

}

exports.default = AeadRandomCipherPreset;