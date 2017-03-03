import crypto from 'crypto';
import {IPreset} from '../interface';

const HASH_SALT = 'blinksocks';
const IV_LEN = 16;

// available ciphers
const ciphers = [
  'aes-128-ctr', 'aes-192-ctr', 'aes-256-ctr',
  'aes-128-cfb', 'aes-192-cfb', 'aes-256-cfb',
  'aes-128-ofb', 'aes-192-ofb', 'aes-256-ofb',
  'aes-128-cbc', 'aes-192-cbc', 'aes-256-cbc'
];

/**
 * generate strong and valid key
 * @param cipher
 * @param key
 * @returns {Buffer}
 */
function getStrongKey(cipher, key) {
  const hash = crypto.createHash('sha256');
  const keyLen = cipher.split('-')[1] / 8;
  hash.update(Buffer.concat([Buffer.from(key), Buffer.from(HASH_SALT)]));
  return hash.digest().slice(0, keyLen);
}

/**
 * @description
 *   Perform encrypt/decrypt using NodeJS 'crypto' module(OpenSSL wrappers).
 *
 * @params
 *   cipher (String): Which cipher is picked from OpenSSL library.
 *
 * @examples
 *   "crypto": "openssl"
 *   "crypto_params": "aes-128-cfb"
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
 */
export default class OpenSSLCrypto extends IPreset {

  _isHandshakeDone = false;

  _cipher = '';

  _key = null;

  _iv = null;

  constructor(cipher) {
    super();
    if (typeof cipher !== 'string' || cipher === '') {
      throw Error('\'crypto_params\' requires [cipher] parameter.');
    }
    if (!ciphers.includes(cipher)) {
      throw Error(`cipher \'${cipher}\' is not supported.`);
    }
    this._cipher = cipher;
    this._key = getStrongKey(cipher, __KEY__);
  }

  clientOut({buffer}) {
    if (!this._isHandshakeDone) {
      const iv = crypto.randomBytes(IV_LEN);
      const encrypted = this.encrypt(Buffer.concat([iv, buffer]));
      this._iv = iv;
      this._isHandshakeDone = true;
      return encrypted;
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
    return this.decrypt(buffer);
  }

  encrypt(buffer) {
    let cipher;
    if (this._iv === null) {
      cipher = crypto.createCipher(this._cipher, this._key);
    } else {
      cipher = crypto.createCipheriv(this._cipher, this._key, this._iv);
    }
    return Buffer.concat([cipher.update(buffer), cipher.final()]);
  }

  decrypt(buffer) {
    let decipher;
    if (this._iv === null) {
      decipher = crypto.createDecipher(this._cipher, this._key);
    } else {
      decipher = crypto.createDecipheriv(this._cipher, this._key, this._iv);
    }
    return Buffer.concat([decipher.update(buffer), decipher.final()]);
  }

}
