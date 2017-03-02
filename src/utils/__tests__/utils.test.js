import {Utils} from '../../utils';

describe('Utils#toBytesBE', function () {

  it('should return <Buffer 01, 01> when pass 257', function () {
    expect(Utils.toBytesBE(257).equals(Buffer.from([0x01, 0x01]))).toBe(true);
  });

  it('should throw when pass an out of range number', function () {
    expect(() => Utils.toBytesBE(65535 + 1, 2)).toThrow();
  });

});

describe('Utils#hostToAddress', function () {

  it('should return an instance of Address', function () {
    const {ATYP, DSTADDR, DSTPORT} = Utils.hostToAddress('192.168.1.1');
    expect(ATYP).toEqual(0x01);
    expect(DSTADDR.equals(Buffer.from([0xc0, 0xa8, 0x01, 0x01]))).toBe(true);
    expect(DSTPORT.equals(Buffer.from([0x00, 0x50]))).toBe(true);
  });

  it('should return an instance of Address', function () {
    const {ATYP, DSTADDR, DSTPORT} = Utils.hostToAddress('https://bing.com');
    expect(ATYP).toEqual(0x03);
    expect(DSTADDR.equals(Buffer.from([0x62, 0x69, 0x6e, 0x67, 0x2e, 0x63, 0x6f, 0x6d]))).toBe(true);
    expect(DSTPORT.equals(Buffer.from([0x00, 0x50]))).toBe(true);
  });

  it('should return an instance of Address', function () {
    const {ATYP, DSTADDR, DSTPORT} = Utils.hostToAddress('bing.com:443');
    expect(ATYP).toEqual(0x03);
    expect(DSTADDR.equals(Buffer.from([0x62, 0x69, 0x6e, 0x67, 0x2e, 0x63, 0x6f, 0x6d]))).toBe(true);
    expect(DSTPORT.equals(Buffer.from([0x01, 0xbb]))).toBe(true);
  });

});
