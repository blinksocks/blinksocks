import {Utils} from '../../utils';

describe('Utils#numberToUIntBE', function () {

  it('should return <Buffer 01, 01> when pass 257', function () {
    expect(Utils.numberToUIntBE(257).equals(Buffer.from([0x01, 0x01]))).toBe(true);
  });

  it('should throw when len < 1', function () {
    expect(() => Utils.numberToUIntBE(255, 0)).toThrow();
  });

  it('should throw when pass an out of range number', function () {
    expect(() => Utils.numberToUIntBE(65535 + 1, 2)).toThrow();
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
