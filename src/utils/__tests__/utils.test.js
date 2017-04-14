import {Utils, BYTE_ORDER_LE} from '../../utils';

describe('Utils#numberToUInt', function () {

  it('should return <Buffer 01, 02> in big-endian when pass 258', function () {
    expect(Utils.numberToUInt(258).equals(Buffer.from([0x01, 0x02]))).toBe(true);
  });

  it('should return <Buffer 02, 01> in little-endian when pass 258', function () {
    expect(Utils.numberToUInt(258, 2, BYTE_ORDER_LE).equals(Buffer.from([0x02, 0x01]))).toBe(true);
  });

  it('should throw when len < 1', function () {
    expect(() => Utils.numberToUInt(255, 0)).toThrow();
  });

  it('should throw when pass an out of range number', function () {
    expect(() => Utils.numberToUInt(65535 + 1, 2)).toThrow();
  });

});

describe('Utils#parseURI', function () {

  it('should return expected object', function () {
    let addr = Utils.parseURI('http://bing.com');
    expect(addr).toMatchObject({
      type: 3,
      host: Buffer.from('bing.com'),
      port: Utils.numberToUInt(80)
    });

    addr = Utils.parseURI('bing.com');
    expect(addr).toMatchObject({
      type: 3,
      host: Buffer.from('bing.com'),
      port: Utils.numberToUInt(80)
    });

    addr = Utils.parseURI('bing.com:443');
    expect(addr).toMatchObject({
      type: 3,
      host: Buffer.from('bing.com'),
      port: Utils.numberToUInt(443)
    });

    addr = Utils.parseURI('https://bing.com');
    expect(addr).toMatchObject({
      type: 3,
      host: Buffer.from('bing.com'),
      port: Utils.numberToUInt(443)
    });
  });

});

describe('Utils#getRandomInt', function () {

  it('should return a number', function () {
    const number = Utils.getRandomInt(1, 2);
    expect(number).toBeGreaterThanOrEqual(1);
    expect(number).toBeLessThan(2);
  });

});

describe('Utils#isValidHostname', function () {

  it('should return false', function () {
    expect(Utils.isValidHostname('')).toBe(false);
  });

  it('should return false', function () {
    expect(Utils.isValidHostname('a.')).toBe(false);
  });

  it('should return false', function () {
    expect(Utils.isValidHostname(`${'a'.repeat(64)}.com`)).toBe(false);
  });

  it('should return true', function () {
    expect(Utils.isValidHostname(`${'a'.repeat(63)}.com`)).toBe(true);
  });

});

describe('Utils#isValidPort', function () {

  it('should return false', function () {
    expect(Utils.isValidPort('')).toBe(false);
  });

  it('should return false', function () {
    expect(Utils.isValidPort(-1)).toBe(false);
  });

  it('should return true', function () {
    expect(Utils.isValidPort(80)).toBe(true);
  });

});

describe('Utils#md5', function () {

  it('should return expected buffer', function () {
    const src = Buffer.from([1, 2, 3, 4]);
    const dst = Buffer.from('08d6c05a21512a79a1dfeb9d2a8f262f', 'hex');
    expect(Utils.md5(src).equals(dst)).toBe(true);
  });

});

describe('Utils#EVP_BytesToKey', function () {

  it('should return true', function () {
    const password = Buffer.from('password');
    const keyLen = 16;
    const ivLen = 16;
    const dst = Buffer.from('5f4dcc3b5aa765d61d8327deb882cf99', 'hex');
    expect(Utils.EVP_BytesToKey(password, keyLen, ivLen).equals(dst)).toBe(true);
  });

});
