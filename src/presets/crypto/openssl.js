import crypto from 'crypto';
import {IPreset} from '../interface';

const IV_LEN = 16;

// available ciphers
const ciphers = [
  // both supported
  'aes-128-ctr', 'aes-192-ctr', 'aes-256-ctr',
  'aes-128-cfb', 'aes-192-cfb', 'aes-256-cfb',
  'camellia-128-cfb', 'camellia-192-cfb', 'camellia-256-cfb',
  // blinksocks supported
  'aes-128-ofb', 'aes-192-ofb', 'aes-256-ofb',
  'aes-128-cbc', 'aes-192-cbc', 'aes-256-cbc'
];

/**
 * md5 message digest
 * @param buffer
 * @returns {*}
 */
function md5(buffer) {
  const md5 = crypto.createHash('md5');
  md5.update(buffer);
  return md5.digest();
}

/**
 * EVP_BytesToKey with the digest algorithm set to MD5, one iteration, and no salt
 *
 * @algorithm
 *   D_i = HASH^count(D_(i-1) || data || salt)
 */
function EVP_BytesToKey(password, keyLen, ivLen = IV_LEN) {
  let _data = Buffer.from(password);
  let i = 0;
  const bufs = [];
  while (Buffer.concat(bufs).length < (keyLen + ivLen)) {
    if (i > 0) {
      _data = Buffer.concat([bufs[i - 1], Buffer.from(password)]);
    }
    bufs.push(md5(_data));
    i += 1;
  }
  return Buffer.concat(bufs).slice(0, keyLen);
}

/**
 * @description
 *   Perform encrypt/decrypt using Node.js 'crypto' module(OpenSSL wrappers).
 *
 * @params
 *   cipher (String): Which cipher is picked from OpenSSL library.
 *
 * @examples
 *   "crypto": "openssl"
 *   "crypto_params": "aes-256-cfb"
 *
 * @protocol
 *
 *   # TCP handshake
 *   +-------+----------------------------+
 *   |  IV   |          PAYLOAD           |
 *   +-------+----------------------------+
 *   | Fixed |         Variable           |
 *   +-------+----------------------------+
 *
 *   # TCP chunk
 *   +----------------------------+
 *   |          PAYLOAD           |
 *   +----------------------------+
 *   |         Variable           |
 *   +----------------------------+
 *
 * @explain
 *   1. Key derivation function is EVP_BytesToKey.
 *   2. IV is plaintext.
 *   3. Client Cipher IV = Server Decipher IV, vice versa.
 *
 * @reference
 *   [1] EVP_BytesToKey
 *       https://www.openssl.org/docs/man1.0.2/crypto/EVP_BytesToKey.html
 *       https://github.com/shadowsocks/shadowsocks/blob/master/shadowsocks/cryptor.py#L53
 */
export default class OpenSSLCrypto extends IPreset {

  _cipherName = '';

  _key = null;

  _cipher = null;

  _decipher = null;

  constructor(cipherName) {
    super();
    if (typeof cipherName !== 'string' || cipherName === '') {
      throw Error('\'crypto_params\' requires [cipher] parameter.');
    }
    if (!ciphers.includes(cipherName)) {
      throw Error(`cipher \'${cipherName}\' is not supported.`);
    }
    this._cipherName = cipherName;
    this._key = EVP_BytesToKey(__KEY__, this._cipherName.split('-')[1] / 8);
  }

  beforeOut({buffer}) {
    if (!this._cipher) {
      const iv = crypto.randomBytes(IV_LEN);
      this._cipher = crypto.createCipheriv(this._cipherName, this._key, iv);
      return Buffer.concat([iv, this.encrypt(buffer)]);
    } else {
      return this.encrypt(buffer);
    }
  }

  beforeIn({buffer}) {
    if (!this._decipher) {
      const iv = buffer.slice(0, IV_LEN);
      this._decipher = crypto.createDecipheriv(this._cipherName, this._key, iv);
      return this.decrypt(buffer.slice(IV_LEN));
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
