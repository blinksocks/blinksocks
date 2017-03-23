import crypto from 'crypto';
import {IPreset} from '../interface';

const IV_LEN = 16;

// available ciphers
const ciphers = [
  'aes-128-ctr', 'aes-192-ctr', 'aes-256-ctr',
  'aes-128-cfb', 'aes-192-cfb', 'aes-256-cfb'
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
 *   Perform encrypt/decrypt using NodeJS 'crypto' module(OpenSSL wrappers).
 *
 * @params
 *   cipher (String): Which cipher is picked from OpenSSL library.
 *
 * @examples
 *   "crypto": "ss-openssl"
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
export default class SSOpenSSLCrypto extends IPreset {

  _cipher = '';

  _key = null;

  _cipherIV = null;

  _decipherIV = null;

  constructor(cipher) {
    super();
    if (typeof cipher !== 'string' || cipher === '') {
      throw Error('\'crypto_params\' requires [cipher] parameter.');
    }
    if (!ciphers.includes(cipher)) {
      throw Error(`cipher \'${cipher}\' is not supported.`);
    }
    this._cipher = cipher;
    this._key = EVP_BytesToKey(__KEY__, this._cipher.split('-')[1] / 8);
  }

  clientOut({buffer}) {
    if (!this._cipherIV) {
      this._cipherIV = crypto.randomBytes(IV_LEN);
      return Buffer.concat([this._cipherIV, this.encrypt(buffer)]);
    } else {
      return this.encrypt(buffer);
    }
  }

  serverIn({buffer}) {
    if (!this._isHandshakeDone) {
      const decrypted = this.decrypt(buffer);
      this._iv = decrypted.slice(0, IV_LEN);
      this._isHandshakeDone = true;
      return decrypted.slice(IV_LEN);
    } else {
      return this.decrypt(buffer);
    }
  }

  serverOut({buffer}) {
    return this.encrypt(buffer);
  }

  clientIn({buffer}) {
    if (!this._decipherIV) {
      this._decipherIV = buffer.slice(0, IV_LEN);
      return this.decrypt(buffer.slice(IV_LEN));
    } else {
      return this.decrypt(buffer);
    }
  }

  encrypt(buffer) {
    const cipher = crypto.createCipheriv(this._cipher, this._key, this._cipherIV);
    return Buffer.concat([cipher.update(buffer), cipher.final()]);
  }

  decrypt(buffer) {
    const decipher = crypto.createDecipheriv(this._cipher, this._key, this._decipherIV);
    return Buffer.concat([decipher.update(buffer), decipher.final()]);
  }

}
