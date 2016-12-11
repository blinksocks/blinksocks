jest.mock('../Config');

import {Crypto} from '../Crypto';

const plainText = Buffer.from([0x00, 0x01, 0x02]);
const cipherText = Buffer.from([0x9b, 0x80, 0x50]);
const hash = '81226733f35ff94c86f0d4e7086184d016be2ed9435a583cdf178214228cd799';

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
