import ip from 'ip';
import {
  numberToBuffer,
  parseURI,
  getRandomInt,
  getRandomChunks,
  getChunks,
  getUTC,
  hexStringToBuffer,
  isValidHostname,
  isValidPort,
  md5,
  hmac,
  EVP_BytesToKey,
  HKDF,
  BYTE_ORDER_LE
} from '../common';

describe('numberToBuffer', function () {

  it('should return <Buffer 01, 02> in big-endian when pass 258', function () {
    expect(numberToBuffer(258).equals(Buffer.from([0x01, 0x02]))).toBe(true);
  });

  it('should return <Buffer 02, 01> in little-endian when pass 258', function () {
    expect(numberToBuffer(258, 2, BYTE_ORDER_LE).equals(Buffer.from([0x02, 0x01]))).toBe(true);
  });

  it('should throw when len < 1', function () {
    expect(() => numberToBuffer(255, 0)).toThrow();
  });

  it('should throw when pass an out of range number', function () {
    expect(() => numberToBuffer(65535 + 1, 2)).toThrow();
  });

});

describe('parseURI', function () {

  it('should return expected object', function () {
    let addr = parseURI('http://bing.com');
    expect(addr).toMatchObject({
      type: 3,
      host: Buffer.from('bing.com'),
      port: numberToBuffer(80)
    });

    addr = parseURI('bing.com');
    expect(addr).toMatchObject({
      type: 3,
      host: Buffer.from('bing.com'),
      port: numberToBuffer(80)
    });

    addr = parseURI('bing.com:443');
    expect(addr).toMatchObject({
      type: 3,
      host: Buffer.from('bing.com'),
      port: numberToBuffer(443)
    });

    addr = parseURI('https://bing.com');
    expect(addr).toMatchObject({
      type: 3,
      host: Buffer.from('bing.com'),
      port: numberToBuffer(443)
    });

    addr = parseURI('192.168.1.1:443');
    expect(addr).toMatchObject({
      type: 1,
      host: ip.toBuffer('192.168.1.1'),
      port: numberToBuffer(443)
    });

    addr = parseURI('https://[::1]:8080');
    expect(addr).toMatchObject({
      type: 4,
      host: ip.toBuffer('::1'),
      port: numberToBuffer(8080)
    });

    addr = parseURI('[::1]:443');
    expect(addr).toMatchObject({
      type: 4,
      host: ip.toBuffer('::1'),
      port: numberToBuffer(443)
    });
  });

});

describe('getRandomInt', function () {

  it('should return a number', function () {
    const number = getRandomInt(1, 2);
    expect(number).toBeGreaterThanOrEqual(1);
    expect(number).toBeLessThanOrEqual(2);
  });

});

describe('getRandomChunks', function () {

  it('should return expected random chunks', function () {
    const chunks = getRandomChunks([1, 2, 3], 2, 2);
    expect(chunks[0]).toEqual([1, 2]);
    expect(chunks[1]).toEqual([3]);
  });

});

describe('getChunks', function () {

  it('should return expected chunks', function () {
    const chunks = getChunks([1, 2, 3], 2);
    expect(chunks[0]).toEqual([1, 2]);
    expect(chunks[1]).toEqual([3]);
  });

});

describe('getUTC', function () {

  it('should return 4 bytes', function () {
    const utc = getUTC();
    expect(utc.length).toBe(4);
  });

});

describe('hexStringToBuffer', function () {

  it('should return expected buffer', function () {
    const buffer = hexStringToBuffer('abcd');
    expect(buffer.equals(Buffer.from([0xab, 0xcd]))).toBe(true);
  });

});

describe('isValidHostname', function () {

  it('should return false', function () {
    expect(isValidHostname('')).toBe(false);
  });

  it('should return false', function () {
    expect(isValidHostname('a.')).toBe(false);
  });

  it('should return false', function () {
    expect(isValidHostname(`${'a'.repeat(64)}.com`)).toBe(false);
  });

  it('should return true', function () {
    expect(isValidHostname(`${'a'.repeat(63)}.com`)).toBe(true);
  });

});

describe('isValidPort', function () {

  it('should return false', function () {
    expect(isValidPort('')).toBe(false);
  });

  it('should return false', function () {
    expect(isValidPort(-1)).toBe(false);
  });

  it('should return true', function () {
    expect(isValidPort(80)).toBe(true);
  });

});

describe('md5', function () {

  it('should return expected buffer', function () {
    const src = Buffer.from([1, 2, 3, 4]);
    const dst = Buffer.from('08d6c05a21512a79a1dfeb9d2a8f262f', 'hex');
    expect(md5(src).equals(dst)).toBe(true);
  });

});

describe('hmac', function () {

  it('should return expected buffer', function () {
    const src = Buffer.from([1, 2, 3, 4]);
    const dst = Buffer.from('7f8adea19a1ac02186fa895af72a7fa1', 'hex');
    expect(hmac('md5', '', src).equals(dst)).toBe(true);
  });

});

describe('EVP_BytesToKey', function () {

  it('should return true', function () {
    const password = Buffer.from('password');
    const keyLen = 16;
    const ivLen = 16;
    const dst = Buffer.from('5f4dcc3b5aa765d61d8327deb882cf99', 'hex');
    expect(EVP_BytesToKey(password, keyLen, ivLen).equals(dst)).toBe(true);
  });

});

describe('HKDF', function () {

  it('should return expected buffer', function () {
    const hash = 'md5';
    const salt = Buffer.alloc(0);
    const ikm = Buffer.from([1, 2, 3, 4]);
    const info = Buffer.alloc(0);
    const length = 16;
    const dst = Buffer.from('160ade10f83c4275fca1c8cd0583e4e6', 'hex');
    expect(HKDF(hash, salt, ikm, info, length).equals(dst)).toBe(true);
  });

});
