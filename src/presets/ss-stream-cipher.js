import crypto from 'crypto';
import {IPreset} from './defs';
import {EVP_BytesToKey} from '../utils';

// available ciphers and [key size, iv size]
const ciphers = {
  'aes-128-ctr': [16, 16], 'aes-192-ctr': [24, 16], 'aes-256-ctr': [32, 16],
  'aes-128-cfb': [16, 16], 'aes-192-cfb': [24, 16], 'aes-256-cfb': [32, 16],
  'camellia-128-cfb': [16, 16], 'camellia-192-cfb': [24, 16], 'camellia-256-cfb': [32, 16],
  // 'chacha20-ietf': [32, 12], wait for libsodium-wrappers
};

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

  static cipherName = '';

  static key = null;

  static ivSize = 0;

  _cipher = null;

  _decipher = null;

  _iv = null;

  static checkParams({method}) {
    if (typeof method !== 'string' || method === '') {
      throw Error('\'method\' must be set');
    }
    const cipherNames = Object.keys(ciphers);
    if (!cipherNames.includes(method)) {
      throw Error(`'method' must be one of [${cipherNames}]`);
    }
  }

  static onInit({method}) {
    const [keySize, ivSize] = ciphers[method];
    SsStreamCipherPreset.cipherName = method;
    SsStreamCipherPreset.key = EVP_BytesToKey(__KEY__, keySize, ivSize);
    SsStreamCipherPreset.ivSize = ivSize;
  }

  get iv() {
    return this._iv;
  }

  constructor() {
    super();
    const {ivSize} = SsStreamCipherPreset;
    this._iv = crypto.randomBytes(ivSize);
  }

  onDestroy() {
    this._cipher = null;
    this._decipher = null;
    this._iv = null;
  }

  // tcp

  beforeOut({buffer}) {
    if (!this._cipher) {
      const {cipherName, key} = SsStreamCipherPreset;
      this._cipher = crypto.createCipheriv(cipherName, key, this._iv);
      return Buffer.concat([this._iv, this._cipher.update(buffer)]);
    } else {
      return this._cipher.update(buffer);
    }
  }

  beforeIn({buffer, fail}) {
    if (!this._decipher) {
      const {cipherName, key, ivSize} = SsStreamCipherPreset;
      if (buffer.length < ivSize) {
        return fail(`buffer is too short to get iv, len=${buffer.length} dump=${buffer.toString('hex')}`);
      }
      this._iv = buffer.slice(0, ivSize);
      this._decipher = crypto.createDecipheriv(cipherName, key, this._iv);
      return this._decipher.update(buffer.slice(ivSize));
    } else {
      return this._decipher.update(buffer);
    }
  }

  // udp

  beforeOutUdp({buffer}) {
    const {cipherName, key, ivSize} = SsStreamCipherPreset;
    const iv = crypto.randomBytes(ivSize);
    const cipher = crypto.createCipheriv(cipherName, key, iv);
    return Buffer.concat([iv, cipher.update(buffer), cipher.final()]);
  }

  beforeInUdp({buffer, fail}) {
    const {cipherName, key, ivSize} = SsStreamCipherPreset;
    if (buffer.length < ivSize) {
      return fail(`buffer is too short to get iv, len=${buffer.length} dump=${buffer.toString('hex')}`);
    }
    const iv = buffer.slice(0, ivSize);
    const decipher = crypto.createDecipheriv(cipherName, key, iv);
    return Buffer.concat([decipher.update(buffer.slice(ivSize)), decipher.final()]);
  }

}
