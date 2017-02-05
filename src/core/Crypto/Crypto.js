import crypto from 'crypto';
import {AdvancedBuffer} from '../AdvancedBuffer';

const HASH_SALT = 'blinksocks';
const CRYPTO_TYPE_CIPHER = 0;
const CRYPTO_TYPE_DECIPHER = 1;
const CRYPTO_TYPE_NONE = 3;
const CRYPTO_DEFAULT_CIPHER = 'aes-256-cfb';
export const CRYPTO_IV_LEN = 16;

/**
 * supported ciphers, key length and IV length
 */
const cipherKeyIVLens = {
  'aes-128-ctr': [16, 16],
  'aes-192-ctr': [24, 16],
  'aes-256-ctr': [32, 16],
  'aes-128-cfb': [16, 16],
  'aes-192-cfb': [24, 16],
  'aes-256-cfb': [32, 16],
};

class FakeStream {

  constructor(collector) {
    this.collector = collector;
  }

  static create(collector) {
    return new FakeStream(collector);
  }

  write(buffer) {
    this.collector(buffer);
  }

  on(/* event, callback */) {

  }

}

/**
 * encrypt/decrypt data by a cipher/key obtained from config.json
 */
export class Crypto {

  static _create(type, collector, iv) {
    const [cipher, key] = [__CIPHER__, __KEY__];

    let stream = null;
    const _type = cipher === '' ? CRYPTO_TYPE_NONE : type;
    const _iv = (typeof iv === 'undefined') ? null : iv;

    switch (_type) {
      case CRYPTO_TYPE_CIPHER:
        stream = _iv === null ? crypto.createCipher(cipher, key) : crypto.createCipheriv(cipher, key, iv);
        break;
      case CRYPTO_TYPE_DECIPHER:
        stream = _iv === null ? crypto.createDecipher(cipher, key) : crypto.createDecipheriv(cipher, key, iv);
        break;
      case CRYPTO_TYPE_NONE:
        stream = FakeStream.create(collector);
        break;
      default:
        throw Error(`unknown type: ${type}`);
    }

    const _buffer = new AdvancedBuffer();
    _buffer.on('data', (data) => collector(data));

    stream.on('readable', () => {
      const data = stream.read();
      if (data !== null) {
        if (__IS_SERVER__ && _type === CRYPTO_TYPE_DECIPHER) {
          _buffer.put(data);
        } else {
          collector(data);
        }
      }
    });

    return stream;
  }

  static createCipher(collector, iv) {
    return Crypto._create(CRYPTO_TYPE_CIPHER, collector, iv);
  }

  static createDecipher(collector, iv) {
    return Crypto._create(CRYPTO_TYPE_DECIPHER, collector, iv);
  }

  static hash(text) {
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.concat([
      Buffer.from(text),
      Buffer.from(HASH_SALT)
    ]));
    return hash.digest('hex');
  }

  static isAvailable(cipher) {
    return !(typeof cipherKeyIVLens[cipher] === 'undefined');
  }

  static getCiphers() {
    return Object.keys(cipherKeyIVLens);
  }

  /**
   * generate key from config.key
   * @param cipher
   * @param key
   * @returns {string}
   */
  static getStrongKey(cipher, key) {
    const keyLen = this.getKeySize(cipher);
    return this.hash(key).substr(0, keyLen);
  }

  static getKeySize(cipher) {
    return cipherKeyIVLens[cipher][0];
  }

  /**
   * pick a valid cipher if is available on the current platform
   * @returns {boolean}
   */
  static getCipher(tryCipher) {
    let cipher = tryCipher;
    try {
      const crypto = require('crypto');
      crypto.createCipher(cipher, '');
    } catch (err) {
      if (err.message.indexOf('cipher') !== -1) {
        console.warn(`unsupported cipher: '${cipher}', fallback to: '${CRYPTO_DEFAULT_CIPHER}'`);
        cipher = CRYPTO_DEFAULT_CIPHER;
      } else {
        console.error('crypto module is unavailable, please re-build your Node.js with [crypto] module.');
        process.exit(-1);
      }
    }
    return cipher;
  }

}
