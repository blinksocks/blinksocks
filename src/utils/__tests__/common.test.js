import {
  numberToBuffer,
  getRandomInt,
  getRandomChunks,
  getChunks,
  BYTE_ORDER_LE,
  generateMutexId
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

describe('generateMutexId', () => {

  it('should return mutex id', () => {
    expect(generateMutexId([], 0)).toBe(-1);
    expect(generateMutexId([1, 2, 3], 1)).toBe(0);
    expect(generateMutexId([1, 2, 3])).not.toContain(1);
    expect(generateMutexId([1, 2, 3])).not.toContain(2);
    expect(generateMutexId([1, 2, 3])).not.toContain(3);
  });

});
