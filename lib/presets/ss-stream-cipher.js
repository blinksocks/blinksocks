'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _defs = require('./defs');

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const ciphers = {
  'aes-128-ctr': [16, 16], 'aes-192-ctr': [24, 16], 'aes-256-ctr': [32, 16],
  'aes-128-cfb': [16, 16], 'aes-192-cfb': [24, 16], 'aes-256-cfb': [32, 16],
  'camellia-128-cfb': [16, 16],
  'camellia-192-cfb': [24, 16],
  'camellia-256-cfb': [32, 16],
  'rc4-md5': [16, 16],
  'rc4-md5-6': [16, 6],

  'none': [16, 0],

  'chacha20-ietf': [32, 12]
};

const DEFAULT_METHOD = 'aes-256-ctr';
const NOOP = Buffer.alloc(0);

class SsStreamCipherPreset extends _defs.IPreset {
  constructor(...args) {
    var _temp;

    return _temp = super(...args), this._algorithm = '', this._key = null, this._iv = null, this._ivSize = 0, this._cipher = null, this._decipher = null, _temp;
  }

  get key() {
    return this._key;
  }

  get iv() {
    return this._iv;
  }

  static onCheckParams({ method = DEFAULT_METHOD }) {
    if (typeof method !== 'string' || method === '') {
      throw Error('\'method\' must be set');
    }
    const cipherNames = Object.keys(ciphers);
    if (!cipherNames.includes(method)) {
      throw Error(`'method' must be one of [${cipherNames}]`);
    }
    if (method === 'chacha20-ietf' && !process.version.startsWith('v10')) {
      throw Error('require Node.js v10.x to run "chacha20-ietf"');
    }
  }

  onInit({ method = DEFAULT_METHOD }) {
    const [keySize, ivSize] = ciphers[method];
    const iv = _crypto2.default.randomBytes(ivSize);
    this._algorithm = method;
    this._ivSize = ivSize;
    this._key = (0, _utils.EVP_BytesToKey)(this._config.key, keySize, ivSize);
    this._iv = iv;
    if (this._algorithm.startsWith('rc4')) {
      this._algorithm = 'rc4';
      if (this._algorithm === 'rc4-md5-6') {
        this._iv = this._iv.slice(0, 6);
      }
    }
    if (this._algorithm === 'chacha20-ietf') {
      this._algorithm = 'chacha20';
    }
  }

  onDestroy() {
    this._key = null;
    this._iv = null;
    this._cipher = null;
    this._decipher = null;
  }

  createCipher(key, iv) {
    const algorithm = this._algorithm;
    let _key = key;
    let _iv = iv;
    if (algorithm === 'rc4') {
      _key = (0, _utils.hash)('md5', Buffer.concat([_key, _iv]));
      _iv = NOOP;
    } else if (algorithm === 'none') {
      return {
        update: buffer => buffer
      };
    } else if (algorithm === 'chacha20') {
      _iv = Buffer.concat([Buffer.alloc(4), _iv]);
    }
    return _crypto2.default.createCipheriv(algorithm, _key, _iv);
  }

  createDecipher(key, iv) {
    const algorithm = this._algorithm;
    let _key = key;
    let _iv = iv;
    if (algorithm === 'rc4') {
      _key = (0, _utils.hash)('md5', Buffer.concat([_key, _iv]));
      _iv = NOOP;
    } else if (algorithm === 'none') {
      return {
        update: buffer => buffer
      };
    } else if (algorithm === 'chacha20') {
      _iv = Buffer.concat([Buffer.alloc(4), _iv]);
    }
    return _crypto2.default.createDecipheriv(algorithm, _key, _iv);
  }

  beforeOut({ buffer }) {
    if (!this._cipher) {
      this._cipher = this.createCipher(this._key, this._iv);
      return Buffer.concat([this._iv, this._cipher.update(buffer)]);
    } else {
      return this._cipher.update(buffer);
    }
  }

  beforeIn({ buffer, fail }) {
    if (!this._decipher) {
      const { _ivSize } = this;
      if (buffer.length < _ivSize) {
        return fail(`buffer is too short to get iv, len=${buffer.length} dump=${(0, _utils.dumpHex)(buffer)}`);
      }
      this._iv = buffer.slice(0, _ivSize);
      this._decipher = this.createDecipher(this._key, this._iv);
      return this._decipher.update(buffer.slice(_ivSize));
    } else {
      return this._decipher.update(buffer);
    }
  }

  beforeOutUdp({ buffer }) {
    this._iv = _crypto2.default.randomBytes(this._ivSize);
    this._cipher = this.createCipher(this._key, this._iv);
    return Buffer.concat([this._iv, this._cipher.update(buffer)]);
  }

  beforeInUdp({ buffer, fail }) {
    const { _ivSize } = this;
    if (buffer.length < _ivSize) {
      return fail(`buffer is too short to get iv, len=${buffer.length} dump=${(0, _utils.dumpHex)(buffer)}`);
    }
    this._iv = buffer.slice(0, _ivSize);
    this._decipher = this.createDecipher(this._key, this._iv);
    return this._decipher.update(buffer.slice(_ivSize));
  }

}
exports.default = SsStreamCipherPreset;