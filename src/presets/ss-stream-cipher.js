import crypto from 'crypto';
import { IPreset } from './defs';
import { dumpHex, EVP_BytesToKey, hash } from '../utils';

// available ciphers and [key size, iv size]
const ciphers = {
  'aes-128-ctr': [16, 16], 'aes-192-ctr': [24, 16], 'aes-256-ctr': [32, 16],
  'aes-128-cfb': [16, 16], 'aes-192-cfb': [24, 16], 'aes-256-cfb': [32, 16],
  'camellia-128-cfb': [16, 16],
  'camellia-192-cfb': [24, 16],
  'camellia-256-cfb': [32, 16],
  'rc4-md5': [16, 16],
  'rc4-md5-6': [16, 6],

  // NOTE: "none" cipher is just prepared for "ssr-auth-chain-*" presets.
  // DO NOT use "none" without "ssr-auth-chain-*".
  'none': [16, 0],

  // require Node.js v10.x
  'chacha20-ietf': [32, 12],
};

const DEFAULT_METHOD = 'aes-256-ctr';
const NOOP = Buffer.alloc(0);

/**
 * @description
 *   Perform stream encrypt/decrypt.
 *
 * @params
 *   method: The cipher name.
 *
 * @examples
 *   {
 *     "name": "ss-stream-cipher",
 *     "params": {
 *       "method": "aes-256-cfb"
 *     }
 *   }
 *
 * @protocol
 *
 *   # TCP stream
 *   +-------+---------------------+---------+
 *   |  IV   |       PAYLOAD       |   ...   |
 *   +-------+---------------------+---------+
 *   | Fixed |      Variable       |   ...   |
 *   +-------+---------------------+---------+
 *
 *   # TCP chunks
 *   +---------------------+
 *   |       PAYLOAD       |
 *   +---------------------+
 *   |      Variable       |
 *   +---------------------+
 *
 *   # UDP packet
 *   +-------+---------------------+
 *   |  IV   |       PAYLOAD       |
 *   +-------+---------------------+
 *   | Fixed |      Variable       |
 *   +-------+---------------------+
 *
 * @explain
 *   1. Key derivation function is EVP_BytesToKey.
 *   2. IV is randomly generated.
 *   3. Client Cipher IV = Server Decipher IV, vice versa.
 *
 * @reference
 *   [1] EVP_BytesToKey
 *       https://www.openssl.org/docs/man1.0.2/crypto/EVP_BytesToKey.html
 *       https://github.com/shadowsocks/shadowsocks/blob/master/shadowsocks/cryptor.py#L53
 */
export default class SsStreamCipherPreset extends IPreset {

  _algorithm = '';

  _key = null;
  _iv = null;

  _ivSize = 0;

  _cipher = null;
  _decipher = null;

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
    const iv = crypto.randomBytes(ivSize);
    this._algorithm = method;
    this._ivSize = ivSize;
    this._key = EVP_BytesToKey(this._config.key, keySize, ivSize);
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
      _key = hash('md5', Buffer.concat([_key, _iv]));
      _iv = NOOP;
    }
    else if (algorithm === 'none') {
      return {
        update: (buffer) => buffer,
      };
    }
    else if (algorithm === 'chacha20') {
      // 4 bytes counter + 12 bytes nonce
      _iv = Buffer.concat([Buffer.alloc(4), _iv]);
    }
    return crypto.createCipheriv(algorithm, _key, _iv);
  }

  createDecipher(key, iv) {
    const algorithm = this._algorithm;
    let _key = key;
    let _iv = iv;
    if (algorithm === 'rc4') {
      _key = hash('md5', Buffer.concat([_key, _iv]));
      _iv = NOOP;
    }
    else if (algorithm === 'none') {
      return {
        update: (buffer) => buffer,
      };
    }
    else if (algorithm === 'chacha20') {
      // 4 bytes counter + 12 bytes nonce
      _iv = Buffer.concat([Buffer.alloc(4), _iv]);
    }
    return crypto.createDecipheriv(algorithm, _key, _iv);
  }

  // tcp

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
        return fail(`buffer is too short to get iv, len=${buffer.length} dump=${dumpHex(buffer)}`);
      }
      this._iv = buffer.slice(0, _ivSize);
      this._decipher = this.createDecipher(this._key, this._iv);
      return this._decipher.update(buffer.slice(_ivSize));
    } else {
      return this._decipher.update(buffer);
    }
  }

  // udp

  beforeOutUdp({ buffer }) {
    this._iv = crypto.randomBytes(this._ivSize);
    this._cipher = this.createCipher(this._key, this._iv);
    return Buffer.concat([this._iv, this._cipher.update(buffer)]);
  }

  beforeInUdp({ buffer, fail }) {
    const { _ivSize } = this;
    if (buffer.length < _ivSize) {
      return fail(`buffer is too short to get iv, len=${buffer.length} dump=${dumpHex(buffer)}`);
    }
    this._iv = buffer.slice(0, _ivSize);
    this._decipher = this.createDecipher(this._key, this._iv);
    return this._decipher.update(buffer.slice(_ivSize));
  }

}
