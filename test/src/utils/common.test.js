import {
  numberToBuffer,
  getRandomInt,
  getRandomChunks,
  getChunks,
  incrementBE,
  incrementLE,
  BYTE_ORDER_LE,
} from '../../../src/utils/common';

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
    const chunks = getRandomChunks([1, 2, 3, 4], 1, 3);
    expect(chunks[0].length).toBeGreaterThanOrEqual(1);
    expect(chunks[1].length).toBeLessThanOrEqual(3);
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

describe('incrementBE', () => {

  it('should return expected buffer', () => {
    const buffer = Buffer.from([0x00, 0xfe]);
    expect(incrementBE(buffer).equals(Buffer.from([0x00, 0xff]))).toBe(true);
    expect(incrementBE(buffer).equals(Buffer.from([0x01, 0x00]))).toBe(true);
    expect(incrementBE(Buffer.from([0xff])).equals(Buffer.from([0x00]))).toBe(true);
  });

});

describe('incrementLE', () => {

  it('should return expected buffer', () => {
    const buffer = Buffer.from([0xfe, 0x00]);
    expect(incrementLE(buffer).equals(Buffer.from([0xff, 0x00]))).toBe(true);
    expect(incrementLE(buffer).equals(Buffer.from([0x00, 0x01]))).toBe(true);
    expect(incrementLE(Buffer.from([0xff])).equals(Buffer.from([0x00]))).toBe(true);
  });

});
