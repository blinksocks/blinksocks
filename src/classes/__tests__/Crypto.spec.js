jest.mock('../Config');

import {Crypto} from '../Crypto';

const plainText = Buffer.from([0x00, 0x01, 0x02]);
const cipherText = Buffer.from([0x9b, 0x80, 0x50]);
const hash = '81226733f35ff94c86f0d4e7086184d016be2ed9435a583cdf178214228cd799';

describe('Crypto#encrypt#decrypt with a cipher', function () {

  beforeEach(function () {
    const {Config} = require('../Config');
    Config.cipher = 'aes-256-cfb';
    Config.key = 'keyfortest';
  });

  it('should return cipherText', function () {
    expect(Crypto.encrypt(plainText).equals(cipherText)).toBe(true);
  });

  it('should return plainText', function () {
    expect(Crypto.decrypt(cipherText).equals(plainText)).toBe(true);
  });

});

describe('Crypto#encrypt#decrypt without a cipher', function () {

  beforeEach(function () {
    const {Config} = require('../Config');
    Config.cipher = '';
    Config.key = '';
  });

  it('should return plainText', function () {
    expect(Crypto.encrypt(plainText).equals(plainText)).toBe(true);
  });

  it('should return cipherText', function () {
    expect(Crypto.decrypt(cipherText).equals(cipherText)).toBe(true);
  });

});

describe('Crypto#hash', function () {
  it('should return right hash', function () {
    expect(Crypto.hash('abc')).toBe(hash);
  });
});
