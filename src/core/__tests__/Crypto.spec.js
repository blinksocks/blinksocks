jest.mock('../Config');

import {Crypto, CRYPTO_IV_LEN} from '../Crypto';

const plainText = Buffer.from([0x00, 0x01, 0x02]);
const cipherText = Buffer.from([0x9b, 0x80, 0x50]);
const hash = '81226733f35ff94c86f0d4e7086184d016be2ed9435a583cdf178214228cd799';

describe('Crypto#_create', function () {

  beforeEach(function () {
    const {Config} = require('../Config');
    Config.cipher = 'aes-256-cfb';
    Config.key = 'keyfortest';
  });

  it('should throw if type is invalid', function () {
    expect(() => Crypto._create('invalid_type', () => 0)).toThrow();
  });

});

describe('Crypto#createCipher', function () {

  beforeEach(function () {
    const {Config} = require('../Config');
    Config.cipher = 'aes-256-cfb';
    Config.key = 'keyfortest';
  });

  it('should get cipherText', function () {
    const collector = jest.fn();
    const stream = Crypto.createCipher(collector);
    stream.write(plainText);
    expect(collector).toBeCalledWith(cipherText);
  });

});

describe('Crypto#createDecipher', function () {

  beforeEach(function () {
    const {Config} = require('../Config');
    Config.cipher = 'aes-256-cfb';
    Config.key = 'keyfortest';
    Config.isServer = true;
  });

  it('should get plainText', function () {
    const collector = jest.fn();
    const stream = Crypto.createDecipher(collector);
    stream.write(cipherText);
    expect(collector).toBeCalledWith(plainText.slice(0, 1));
  });

});

describe('Crypto without a cipher', function () {

  beforeEach(function () {
    const {Config} = require('../Config');
    Config.cipher = '';
    Config.key = '';
  });

  it('should get cipherText', function () {
    const collector = jest.fn();
    const stream = Crypto.createCipher(collector);
    stream.write(cipherText);
    expect(collector).toBeCalledWith(cipherText);
  });

  it('should get plainText', function () {
    const collector = jest.fn();
    const stream = Crypto.createDecipher(collector);
    stream.write(plainText);
    expect(collector).toBeCalledWith(plainText);
  });

});

describe('Crypto#hash', function () {

  it('should return right hash', function () {
    expect(Crypto.hash('abc')).toBe(hash);
  });

});

describe('Crypto#generateIV', function () {

  it('should return a CRYPTO_IV_LEN length buffer', function () {
    expect(Crypto.generateIV().length).toBe(CRYPTO_IV_LEN);
  });

});

describe('Crypto#isAvailable', function () {

  it('should return false if cipher is not available', function () {
    expect(Crypto.isAvailable('cipher')).toBe(false);
  });

});

describe('Crypto#getCiphers', function () {

  it('should return an array', function () {
    expect(Array.isArray(Crypto.getCiphers())).toBe(true);
  });

});

describe('Crypto#getKeySize', function () {

  it('should return 16', function () {
    expect(Crypto.getKeySize('aes-128-ctr')).toBe(16);
  });

});
