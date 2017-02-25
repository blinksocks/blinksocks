import crypto from 'crypto';

const CRYPTO_HASH_SALT = 'blinksocks';

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
  'aes-128-ofb': [16, 16],
  'aes-192-ofb': [24, 16],
  'aes-256-ofb': [32, 16],
  'aes-128-cbc': [16, 16],
  'aes-192-cbc': [24, 16],
  'aes-256-cbc': [32, 16]
};

/**
 * supported message digest algorithm
 */
const hmacLens = {
  'sha1': 20,
  'sha256': 32,
  'sha512': 64
};

/**
 * encrypt/decrypt data by a cipher/key obtained from config.json
 */
export class Crypto {

  /**
   * create cipher with/without IV
   * @param cipher
   * @param key
   * @param iv
   * @returns {Decipher}
   */
  static createCipher(cipher, key, iv) {
    if (iv instanceof Buffer) {
      return crypto.createCipheriv(cipher, key, iv);
    } else {
      return crypto.createCipher(cipher, key);
    }
  }

  /**
   * create decipher with/without IV
   * @param cipher
   * @param key
   * @param iv
   * @returns {Cipher}
   */
  static createDecipher(cipher, key, iv) {
    if (iv instanceof Buffer) {
      return crypto.createDecipheriv(cipher, key, iv);
    } else {
      return crypto.createDecipher(cipher, key);
    }
  }

  /**
   * create HMAC using specified hash algorithm and a key
   * @param hash
   * @param key
   * @returns {Hmac}
   */
  static createHmac(hash, key) {
    return crypto.createHmac(hash, key);
  }

  /**
   * generates cryptographically strong pseudo-random data
   * @param len
   * @returns {Buffer}
   */
  static randomBytes(len) {
    return crypto.randomBytes(len);
  }

  /**
   * get IV length of specified cipher
   * @param cipher
   * @returns {Number}
   */
  static getIVLength(cipher) {
    return cipherKeyIVLens[cipher][1];
  }

  /**
   * get HMAC length of specified algorithm
   * @param algorithm
   * @returns {Number}
   */
  static getHmacLength(algorithm) {
    return hmacLens[algorithm];
  }

  /**
   * generate strong and valid key
   * @param cipher
   * @param key
   * @returns {Buffer}
   */
  static getStrongKey(cipher, key) {
    const hash = crypto.createHash('sha256');
    const keyLen = cipherKeyIVLens[cipher][0];
    hash.update(Buffer.concat([Buffer.from(key), Buffer.from(CRYPTO_HASH_SALT)]));
    return hash.digest().slice(0, keyLen);
  }

  /**
   * check if a cipher is supported
   * @param cipher
   * @returns {boolean}
   */
  static isCipherAvailable(cipher) {
    return !(typeof cipherKeyIVLens[cipher] === 'undefined');
  }

  /**
   * check if a message digest is supported
   * @param hash
   * @returns {boolean}
   */
  static isHashAvailable(hash) {
    return !(typeof hmacLens[hash] === 'undefined');
  }

  /**
   * generate random IV for specified cipher
   * @param cipher
   * @returns {*}
   */
  static generateIV(cipher) {
    return crypto.randomBytes(this.getIVLength(cipher));
  }

}
