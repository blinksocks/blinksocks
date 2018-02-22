'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _defs = require('./defs');

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const TAG_SIZE = 16;
const MIN_CHUNK_LEN = TAG_SIZE * 2 + 3;
const MIN_CHUNK_SPLIT_LEN = 0x0800;
const MAX_CHUNK_SPLIT_LEN = 0x3FFF;

const ciphers = {
  'aes-128-gcm': [16, 16, 12],
  'aes-192-gcm': [24, 24, 12],
  'aes-256-gcm': [32, 32, 12],
  'chacha20-poly1305': [32, 32, 8],
  'chacha20-ietf-poly1305': [32, 32, 12],
  'xchacha20-ietf-poly1305': [32, 32, 24]
};

const libsodium_functions = {
  'chacha20-poly1305': ['crypto_aead_chacha20poly1305_encrypt_detached', 'crypto_aead_chacha20poly1305_decrypt_detached'],
  'chacha20-ietf-poly1305': ['crypto_aead_chacha20poly1305_ietf_encrypt_detached', 'crypto_aead_chacha20poly1305_ietf_decrypt_detached'],
  'xchacha20-ietf-poly1305': ['crypto_aead_xchacha20poly1305_ietf_encrypt_detached', 'crypto_aead_xchacha20poly1305_ietf_decrypt_detached']
};

const HKDF_HASH_ALGORITHM = 'sha1';
const HKDF_INFO = 'ss-subkey';

class SsAeadCipherPreset extends _defs.IPreset {
  constructor(...args) {
    var _temp;

    return _temp = super(...args), this._cipherName = '', this._info = Buffer.from(HKDF_INFO), this._keySize = 0, this._saltSize = 0, this._nonceSize = 0, this._evpKey = null, this._isUseLibSodium = false, this._cipherKey = null, this._decipherKey = null, this._cipherNonce = 0, this._decipherNonce = 0, this._adBuf = null, _temp;
  }

  static onCheckParams({ method }) {
    const cipherNames = Object.keys(ciphers);
    if (!cipherNames.includes(method)) {
      throw Error(`'method' must be one of [${cipherNames}]`);
    }
  }

  onInit({ method }) {
    var _ciphers$method = _slicedToArray(ciphers[method], 3);

    const keySize = _ciphers$method[0],
          saltSize = _ciphers$method[1],
          nonceSize = _ciphers$method[2];

    this._cipherName = method;
    this._keySize = keySize;
    this._saltSize = saltSize;
    this._nonceSize = nonceSize;
    this._evpKey = (0, _utils.EVP_BytesToKey)(this._config.key, keySize, 16);
    this._isUseLibSodium = Object.keys(libsodium_functions).includes(method);
    this._adBuf = new _utils.AdvancedBuffer({ getPacketLength: this.onReceiving.bind(this) });
    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  onDestroy() {
    this._adBuf.clear();
    this._adBuf = null;
    this._cipherKey = null;
    this._decipherKey = null;
    this._cipherNonce = 0;
    this._decipherNonce = 0;
  }

  beforeOut({ buffer }) {
    let salt = null;
    if (this._cipherKey === null) {
      salt = _crypto2.default.randomBytes(this._saltSize);
      this._cipherKey = (0, _utils.HKDF)(HKDF_HASH_ALGORITHM, salt, this._evpKey, this._info, this._keySize);
    }
    const chunks = (0, _utils.getRandomChunks)(buffer, MIN_CHUNK_SPLIT_LEN, MAX_CHUNK_SPLIT_LEN).map(chunk => {
      const dataLen = (0, _utils.numberToBuffer)(chunk.length);

      var _encrypt = this.encrypt(dataLen),
          _encrypt2 = _slicedToArray(_encrypt, 2);

      const encLen = _encrypt2[0],
            lenTag = _encrypt2[1];

      var _encrypt3 = this.encrypt(chunk),
          _encrypt4 = _slicedToArray(_encrypt3, 2);

      const encData = _encrypt4[0],
            dataTag = _encrypt4[1];

      return Buffer.concat([encLen, lenTag, encData, dataTag]);
    });
    if (salt) {
      return Buffer.concat([salt, ...chunks]);
    } else {
      return Buffer.concat(chunks);
    }
  }

  beforeIn({ buffer, next, fail }) {
    this._adBuf.put(buffer, { next, fail });
  }

  onReceiving(buffer, { fail }) {
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

    var _ref = [buffer.slice(0, 2), buffer.slice(2, 2 + TAG_SIZE)];
    const encLen = _ref[0],
          lenTag = _ref[1];

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
    return 2 + TAG_SIZE + dataLen + TAG_SIZE;
  }

  onChunkReceived(chunk, { next, fail }) {
    var _ref2 = [chunk.slice(2 + TAG_SIZE, -TAG_SIZE), chunk.slice(-TAG_SIZE)];
    const encData = _ref2[0],
          dataTag = _ref2[1];

    const data = this.decrypt(encData, dataTag);
    if (data === null) {
      return fail(`unexpected Data_TAG=${dataTag.toString('hex')} when verify Data=${encData.slice(0, 60).toString('hex')}, dump=${chunk.slice(0, 60).toString('hex')}`);
    }
    next(data);
  }

  encrypt(message) {
    const cipherName = this._cipherName;
    const cipherKey = this._cipherKey;
    const nonce = (0, _utils.numberToBuffer)(this._cipherNonce, this._nonceSize, _utils.BYTE_ORDER_LE);
    let ciphertext = null;
    let tag = null;
    if (this._isUseLibSodium) {
      const noop = Buffer.alloc(0);
      const result = libsodium[libsodium_functions[cipherName][0]](message, noop, noop, nonce, cipherKey);
      ciphertext = Buffer.from(result.ciphertext);
      tag = Buffer.from(result.mac);
    } else {
      const cipher = _crypto2.default.createCipheriv(cipherName, cipherKey, nonce);
      ciphertext = Buffer.concat([cipher.update(message), cipher.final()]);
      tag = cipher.getAuthTag();
    }
    this._cipherNonce += 1;
    return [ciphertext, tag];
  }

  decrypt(ciphertext, tag) {
    const cipherName = this._cipherName;
    const decipherKey = this._decipherKey;
    const nonce = (0, _utils.numberToBuffer)(this._decipherNonce, this._nonceSize, _utils.BYTE_ORDER_LE);
    if (this._isUseLibSodium) {
      const noop = Buffer.alloc(0);
      try {
        const plaintext = libsodium[libsodium_functions[cipherName][1]](noop, ciphertext, tag, noop, nonce, decipherKey);
        this._decipherNonce += 1;
        return Buffer.from(plaintext);
      } catch (err) {
        return null;
      }
    } else {
      const decipher = _crypto2.default.createDecipheriv(cipherName, decipherKey, nonce);
      decipher.setAuthTag(tag);
      try {
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        this._decipherNonce += 1;
        return plaintext;
      } catch (err) {
        return null;
      }
    }
  }

  beforeOutUdp({ buffer }) {
    const salt = _crypto2.default.randomBytes(this._saltSize);
    this._cipherKey = (0, _utils.HKDF)(HKDF_HASH_ALGORITHM, salt, this._evpKey, this._info, this._keySize);
    this._cipherNonce = 0;

    var _encrypt5 = this.encrypt(buffer),
        _encrypt6 = _slicedToArray(_encrypt5, 2);

    const ciphertext = _encrypt6[0],
          tag = _encrypt6[1];

    return Buffer.concat([salt, ciphertext, tag]);
  }

  beforeInUdp({ buffer, fail }) {
    const saltSize = this._saltSize;
    if (buffer.length < saltSize) {
      return fail(`too short to get salt, len=${buffer.length} dump=${buffer.toString('hex')}`);
    }
    const salt = buffer.slice(0, saltSize);
    this._decipherKey = (0, _utils.HKDF)(HKDF_HASH_ALGORITHM, salt, this._evpKey, this._info, this._keySize);
    this._decipherNonce = 0;
    if (buffer.length < saltSize + TAG_SIZE + 1) {
      return fail(`too short to verify Data, len=${buffer.length} dump=${buffer.toString('hex')}`);
    }
    var _ref3 = [buffer.slice(saltSize, -TAG_SIZE), buffer.slice(-TAG_SIZE)];
    const encData = _ref3[0],
          dataTag = _ref3[1];

    const data = this.decrypt(encData, dataTag);
    if (data === null) {
      return fail(`unexpected Data_TAG=${dataTag.toString('hex')} when verify Data=${encData.slice(0, 60).toString('hex')}, dump=${buffer.slice(0, 60).toString('hex')}`);
    }
    return data;
  }

}
exports.default = SsAeadCipherPreset;