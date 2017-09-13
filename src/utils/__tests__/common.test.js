import ip from 'ip';
import {
  numberToBuffer,
  parseURI,
  getRandomInt,
  getRandomChunks,
  getChunks,
  BYTE_ORDER_LE
} from '../common';

describe('numberToBuffer', () => {

  it('should return <Buffer 01, 02> in big-endian when pass 258', () => {
    expect(numberToBuffer(258).equals(Buffer.from([0x01, 0x02]))).toBe(true);
  });

  it('should return <Buffer 02, 01> in little-endian when pass 258', () => {
    expect(numberToBuffer(258, 2, BYTE_ORDER_LE).equals(Buffer.from([0x02, 0x01]))).toBe(true);
  });

  it('should throw when len < 1', () => {
    expect(() => numberToBuffer(255, 0)).toThrow();
  });

  it('should throw when pass an out of range number', () => {
    expect(() => numberToBuffer(65535 + 1, 2)).toThrow();
  });

});

describe('parseURI', () => {

  it('should return expected object', () => {
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

describe('getRandomInt', () => {

  it('should return a number', () => {
    const number = getRandomInt(1, 2);
    expect(number).toBeGreaterThanOrEqual(1);
    expect(number).toBeLessThanOrEqual(2);
  });

});

describe('getRandomChunks', () => {

  it('should return expected random chunks', () => {
    const chunks = getRandomChunks([1, 2, 3], 2, 2);
    expect(chunks[0]).toEqual([1, 2]);
    expect(chunks[1]).toEqual([3]);
  });

  it('should return expected random chunks', () => {
    const chunks = getRandomChunks([1, 2, 3, 4], 2, 2);
    expect(chunks[0]).toEqual([1, 2]);
    expect(chunks[1]).toEqual([3, 4]);
  });

});

describe('getChunks', () => {

  it('should return expected chunks', () => {
    const chunks = getChunks([1, 2, 3, 4], 2);
    expect(chunks[0]).toEqual([1, 2]);
    expect(chunks[1]).toEqual([3, 4]);
  });

  it('should return expected chunks', () => {
    const chunks = getChunks([1, 2, 3], 2);
    expect(chunks[0]).toEqual([1, 2]);
    expect(chunks[1]).toEqual([3]);
  });

});
