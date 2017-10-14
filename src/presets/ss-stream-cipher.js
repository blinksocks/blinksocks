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

  onDestroy() {
    this._cipher = null;
    this._decipher = null;
  }

  beforeOut({buffer}) {
    if (!this._cipher) {
      const {cipherName, key, ivSize} = SsStreamCipherPreset;
      const iv = crypto.randomBytes(ivSize);
      this._cipher = crypto.createCipheriv(cipherName, key, iv);
      return Buffer.concat([iv, this.encrypt(buffer)]);
    } else {
      return this.encrypt(buffer);
    }
  }

  beforeIn({buffer, fail}) {
    if (!this._decipher) {
      const {cipherName, key, ivSize} = SsStreamCipherPreset;
      if (buffer.length < ivSize) {
        return fail(`buffer is too short ${buffer.length} bytes to get iv, dump=${buffer.toString('hex')}`);
      }
      const iv = buffer.slice(0, ivSize);
      this._decipher = crypto.createDecipheriv(cipherName, key, iv);
      return this.decrypt(buffer.slice(ivSize));
    } else {
      return this.decrypt(buffer);
    }
  }

  encrypt(buffer) {
    return this._cipher.update(buffer);
  }

  decrypt(buffer) {
    return this._decipher.update(buffer);
  }

}
