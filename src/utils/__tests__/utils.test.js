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
      host: 'bing.com',
      port: 80
    });

    addr = Utils.parseURI('bing.com');
    expect(addr).toMatchObject({
      type: 3,
      host: 'bing.com',
      port: 80
    });

    addr = Utils.parseURI('bing.com:443');
    expect(addr).toMatchObject({
      type: 3,
      host: 'bing.com',
      port: 443
    });

    addr = Utils.parseURI('https://bing.com');
    expect(addr).toMatchObject({
      type: 3,
      host: 'bing.com',
      port: 443
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
