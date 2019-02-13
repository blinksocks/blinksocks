"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _crypto = _interopRequireDefault(require("crypto"));

var _semver = _interopRequireDefault(require("semver"));

var _defs = require("./defs");

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const TAG_SIZE = 16;
const MIN_CHUNK_LEN = TAG_SIZE * 2 + 3;
const MIN_CHUNK_SPLIT_LEN = 0x0800;
const MAX_CHUNK_SPLIT_LEN = 0x3FFF;
const ciphers = {
  'aes-128-gcm': [16, 16, 12],
  'aes-192-gcm': [24, 24, 12],
  'aes-256-gcm': [32, 32, 12],
  'aes-128-ccm': [16, 16, 12],
  'aes-192-ccm': [24, 24, 12],
  'aes-256-ccm': [32, 32, 12],
  'chacha20-poly1305': [32, 32, 8],
  'chacha20-ietf-poly1305': [32, 32, 12],
  'xchacha20-ietf-poly1305': [32, 32, 24]
};
const libsodium_functions = {
  'chacha20-poly1305': ['crypto_aead_chacha20poly1305_encrypt_detached', 'crypto_aead_chacha20poly1305_decrypt_detached'],
  'chacha20-ietf-poly1305': ['crypto_aead_chacha20poly1305_ietf_encrypt_detached', 'crypto_aead_chacha20poly1305_ietf_decrypt_detached'],
  'xchacha20-ietf-poly1305': ['crypto_aead_xchacha20poly1305_ietf_encrypt_detached', 'crypto_aead_xchacha20poly1305_ietf_decrypt_detached']
};
const DEFAULT_METHOD = 'aes-256-gcm';
const HKDF_HASH_ALGORITHM = 'sha1';
const HKDF_INFO = 'ss-subkey';
let libsodium = null;

class SsAeadCipherPreset extends _defs.IPreset {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "_cipherName", '');

    _defineProperty(this, "_info", Buffer.from(HKDF_INFO));

    _defineProperty(this, "_keySize", 0);

    _defineProperty(this, "_saltSize", 0);

    _defineProperty(this, "_nonceSize", 0);

    _defineProperty(this, "_evpKey", null);

    _defineProperty(this, "_isUseLibSodium", false);

    _defineProperty(this, "_cipherKey", null);

    _defineProperty(this, "_decipherKey", null);

    _defineProperty(this, "_cipherNonce", null);

    _defineProperty(this, "_decipherNonce", null);

    _defineProperty(this, "_adBuf", null);
  }

  static onCheckParams({
    method = DEFAULT_METHOD
  }) {
    const cipherNames = Object.keys(ciphers);

    if (!cipherNames.includes(method)) {
      throw Error(`"method" must be one of ${cipherNames}, but got "${method}"`);
    }

    if (method.endsWith('ccm') && !_semver.default.gte(process.versions.node, '10.2.0')) {
      throw Error('CCM mode requires Node.js >= v10.2.0');
    }
  }

  static async onCache() {
    const _sodium = require('libsodium-wrappers');

    await _sodium.ready;

    if (!libsodium) {
      libsodium = _sodium;
    }
  }

  onInit({
    method = DEFAULT_METHOD
  }) {
    const [keySize, saltSize, nonceSize] = ciphers[method];
    this._cipherName = method;
    this._keySize = keySize;
    this._saltSize = saltSize;
    this._nonceSize = nonceSize;
    this._evpKey = (0, _utils.EVP_BytesToKey)(this._config.key, keySize, 16);
    this._isUseLibSodium = Object.keys(libsodium_functions).includes(method);
    this._adBuf = new _utils.AdvancedBuffer({
      getPacketLength: this.onReceiving.bind(this)
    });

    this._adBuf.on('data', this.onChunkReceived.bind(this));

    this._cipherNonce = Buffer.alloc(nonceSize);
    this._decipherNonce = Buffer.alloc(nonceSize);
  }

  onDestroy() {
    this._adBuf.clear();

    this._adBuf = null;
    this._cipherKey = null;
    this._decipherKey = null;
    this._cipherNonce = null;
    this._decipherNonce = null;
  }

  beforeOut({
    buffer
  }) {
    let salt = null;

    if (this._cipherKey === null) {
      salt = _crypto.default.randomBytes(this._saltSize);
      this._cipherKey = (0, _utils.HKDF)(HKDF_HASH_ALGORITHM, salt, this._evpKey, this._info, this._keySize);
    }

    const chunks = (0, _utils.getRandomChunks)(buffer, MIN_CHUNK_SPLIT_LEN, MAX_CHUNK_SPLIT_LEN).map(chunk => {
      const dataLen = (0, _utils.numberToBuffer)(chunk.length);
      const [encLen, lenTag] = this.encrypt(dataLen);
      const [encData, dataTag] = this.encrypt(chunk);
      return Buffer.concat([encLen, lenTag, encData, dataTag]);
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
      const saltSize = this._saltSize;

      if (buffer.length < saltSize) {
        return;
      }

      const salt = buffer.slice(0, saltSize);
      this._decipherKey = (0, _utils.HKDF)(HKDF_HASH_ALGORITHM, salt, this._evpKey, this._info, this._keySize);
      return buffer.slice(saltSize);
    }

    if (buffer.length < MIN_CHUNK_LEN) {
      return;
    }

    const [encLen, lenTag] = [buffer.slice(0, 2), buffer.slice(2, 2 + TAG_SIZE)];
    const dataLenBuf = this.decrypt(encLen, lenTag);

    if (dataLenBuf === null) {
      fail(`unexpected DataLen_TAG=${(0, _utils.dumpHex)(lenTag)} when verify DataLen=${(0, _utils.dumpHex)(encLen)}, dump=${(0, _utils.dumpHex)(buffer)}`);
      return -1;
    }

    const dataLen = dataLenBuf.readUInt16BE(0);

    if (dataLen > MAX_CHUNK_SPLIT_LEN) {
      fail(`invalid DataLen=${dataLen} is over ${MAX_CHUNK_SPLIT_LEN}, dump=${(0, _utils.dumpHex)(buffer)}`);
      return -1;
    }

    return 2 + TAG_SIZE + dataLen + TAG_SIZE;
  }

  onChunkReceived(chunk, {
    next,
    fail
  }) {
    const [encData, dataTag] = [chunk.slice(2 + TAG_SIZE, -TAG_SIZE), chunk.slice(-TAG_SIZE)];
    const data = this.decrypt(encData, dataTag);

    if (data === null) {
      return fail(`unexpected Data_TAG=${(0, _utils.dumpHex)(dataTag)} when verify Data=${(0, _utils.dumpHex)(encData)}, dump=${(0, _utils.dumpHex)(chunk)}`);
    }

    next(data);
  }

  encrypt(message) {
    const cipherName = this._cipherName;
    const cipherKey = this._cipherKey;
    const nonce = this._cipherNonce;
    let ciphertext = null;
    let tag = null;

    if (this._isUseLibSodium) {
      const noop = Buffer.alloc(0);
      const result = libsodium[libsodium_functions[cipherName][0]](message, noop, noop, nonce, cipherKey);
      ciphertext = Buffer.from(result.ciphertext);
      tag = Buffer.from(result.mac);
    } else {
      const cipher = _crypto.default.createCipheriv(cipherName, cipherKey, nonce, {
        authTagLength: TAG_SIZE
      });

      ciphertext = Buffer.concat([cipher.update(message), cipher.final()]);
      tag = cipher.getAuthTag();
    }

    (0, _utils.incrementLE)(nonce);
    return [ciphertext, tag];
  }

  decrypt(ciphertext, tag) {
    const cipherName = this._cipherName;
    const decipherKey = this._decipherKey;
    const nonce = this._decipherNonce;

    if (this._isUseLibSodium) {
      const noop = Buffer.alloc(0);

      try {
        const plaintext = libsodium[libsodium_functions[cipherName][1]](noop, ciphertext, tag, noop, nonce, decipherKey);
        (0, _utils.incrementLE)(nonce);
        return Buffer.from(plaintext);
      } catch (err) {
        return null;
      }
    } else {
      const decipher = _crypto.default.createDecipheriv(cipherName, decipherKey, nonce, {
        authTagLength: TAG_SIZE
      });

      decipher.setAuthTag(tag);

      try {
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        (0, _utils.incrementLE)(nonce);
        return plaintext;
      } catch (err) {
        return null;
      }
    }
  }

  beforeOutUdp({
    buffer
  }) {
    const salt = _crypto.default.randomBytes(this._saltSize);

    this._cipherKey = (0, _utils.HKDF)(HKDF_HASH_ALGORITHM, salt, this._evpKey, this._info, this._keySize);
    this._cipherNonce = Buffer.alloc(this._nonceSize);
    const [ciphertext, tag] = this.encrypt(buffer);
    return Buffer.concat([salt, ciphertext, tag]);
  }

  beforeInUdp({
    buffer,
    fail
  }) {
    const saltSize = this._saltSize;

    if (buffer.length < saltSize) {
      return fail(`too short to get salt, len=${buffer.length} dump=${(0, _utils.dumpHex)(buffer)}`);
    }

    const salt = buffer.slice(0, saltSize);
    this._decipherKey = (0, _utils.HKDF)(HKDF_HASH_ALGORITHM, salt, this._evpKey, this._info, this._keySize);
    this._decipherNonce = Buffer.alloc(this._nonceSize);

    if (buffer.length < saltSize + TAG_SIZE + 1) {
      return fail(`too short to verify Data, len=${buffer.length} dump=${(0, _utils.dumpHex)(buffer)}`);
    }

    const [encData, dataTag] = [buffer.slice(saltSize, -TAG_SIZE), buffer.slice(-TAG_SIZE)];
    const data = this.decrypt(encData, dataTag);

    if (data === null) {
      return fail(`unexpected Data_TAG=${(0, _utils.dumpHex)(dataTag)} when verify Data=${(0, _utils.dumpHex)(encData)}, dump=${(0, _utils.dumpHex)(buffer)}`);
    }

    return data;
  }

}

exports.default = SsAeadCipherPreset;