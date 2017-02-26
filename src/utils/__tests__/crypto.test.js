import crypto from 'crypto';
import {Crypto} from '../crypto';

const CRYPTO_ALGORITHM = 'aes-128-cbc';
const HASH_ALGORITHM = 'sha1';
const KEY = Crypto.randomBytes(16);
const IV = Crypto.randomBytes(16);

describe('Crypto#createCipher', function () {

  it('should return Cipher instance', function () {
    const cipher = Crypto.createCipher(CRYPTO_ALGORITHM, KEY);
    expect(cipher).toBeInstanceOf(crypto.Cipher);
  });

  it('should return Cipheriv instance', function () {
    const cipher = Crypto.createCipher(CRYPTO_ALGORITHM, KEY, IV);
    expect(cipher).toBeInstanceOf(crypto.Cipheriv);
  });

});

describe('Crypto#createDecipher', function () {

  it('should return Decipher instance', function () {
    const decipher = Crypto.createDecipher(CRYPTO_ALGORITHM, KEY);
    expect(decipher).toBeInstanceOf(crypto.Decipher);
  });

  it('should return Decipheriv instance', function () {
    const decipher = Crypto.createDecipher(CRYPTO_ALGORITHM, KEY, IV);
    expect(decipher).toBeInstanceOf(crypto.Decipheriv);
  });

});

describe('Crypto#createHmac', function () {

  it('should return an instance of Hmac', function () {
    const hmac = Crypto.createHmac(HASH_ALGORITHM, KEY);
    expect(hmac).toBeInstanceOf(crypto.Hmac);
  });

});

describe('Crypto#randomBytes', function () {

  it('should return a buffer with 16 bytes', function () {
    const buffer = Crypto.randomBytes(16);
    expect(buffer.length).toBe(16);
  });

});

describe('Crypto#getIVLength', function () {

  it('should return 16', function () {
    const len = Crypto.getIVLength(CRYPTO_ALGORITHM);
    expect(len).toBe(16);
  });

});

describe('Crypto#getHmacLength', function () {

  it('should return 20', function () {
    const len = Crypto.getHmacLength(HASH_ALGORITHM);
    expect(len).toBe(20);
  });

});

describe('Crypto#getStrongKey', function () {

  it('should return expected key', function () {
    const key = Crypto.getStrongKey(CRYPTO_ALGORITHM, 'key');
    const real = Buffer.from([
      0xf3, 0xa7, 0x85, 0x4d, 0xa0, 0x6f, 0x5b, 0x43,
      0x51, 0x75, 0xc5, 0x3a, 0x20, 0xc4, 0xdf, 0x0f
    ]);
    expect(key.equals(real)).toBe(true);
  });

});

describe('Crypto#isCipherAvailable', function () {

  it('should return false', function () {
    expect(Crypto.isCipherAvailable('xxx')).toBe(false);
  });

});

describe('Crypto#isHashAvailable', function () {

  it('should return false', function () {
    expect(Crypto.isHashAvailable('xxx')).toBe(false);
  });

});

describe('Crypto#generateIV', function () {

  it('should return a buffer', function () {
    const IV = Crypto.generateIV(CRYPTO_ALGORITHM);
    expect(IV).toBeInstanceOf(Buffer);
  });

});

describe('Crypto#getAvailableCiphers', function () {

  it('should return an array', function () {
    const ciphers = Crypto.getAvailableCiphers();
    expect(ciphers).toBeInstanceOf(Array);
  });

});

describe('Crypto#getAvailableHashes', function () {

  it('should return an array', function () {
    const hashes = Crypto.getAvailableHashes();
    expect(hashes).toBeInstanceOf(Array);
  });

});
