import {IPreset} from '../interface';
import {Crypto} from '../../utils';

/**
 * @description
 *   Perform encrypt/decrypt using NodeJS 'crypto' module(OpenSSL wrappers).
 *
 * @params
 *    cipher (String): Which cipher is picked from OpenSSL library.
 *
 * @examples
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
    if (!Crypto.isCipherAvailable(cipher)) {
      throw Error(`cipher \'${cipher}\' is not supported, use --ciphers to display all supported ciphers`);
    }
    this._cipher = cipher;
    this._key = Crypto.getStrongKey(cipher, __KEY__);
  }

  clientOut({buffer}) {
    if (!this._isHandshakeDone) {
      const iv = Crypto.generateIV(this._cipher);
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
      const ivLen = Crypto.getIVLength(this._cipher);
      const decrypted = this.decrypt(buffer);
      this._iv = decrypted.slice(0, ivLen);
      this._isHandshakeDone = true;
      return decrypted.slice(ivLen);
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
    const cipher = Crypto.createCipher(this._cipher, this._key, this._iv);
    return Buffer.concat([cipher.update(buffer), cipher.final()]);
  }

  decrypt(buffer) {
    const decipher = Crypto.createDecipher(this._cipher, this._key, this._iv);
    return Buffer.concat([decipher.update(buffer), decipher.final()]);
  }

}
