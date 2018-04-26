import Long from 'long';
import * as crypto from './crypto';

export const BYTE_ORDER_BE = 0;
export const BYTE_ORDER_LE = 1;

/**
 * convert an unsigned number to a buffer,
 * with specified length in specified byte order.
 * @param num
 * @param len
 * @param byteOrder
 * @returns {Buffer}
 */
export function numberToBuffer(num, len = 2, byteOrder = BYTE_ORDER_BE) {
  if (len < 1) {
    throw Error('len must be greater than 0');
  }
  const buf = Buffer.alloc(len);
  if (byteOrder === BYTE_ORDER_BE) {
    buf.writeUIntBE(num, 0, len);
  } else {
    buf.writeUIntLE(num, 0, len);
  }
  return buf;
}

/**
 * convert uint64 to buffer
 * @param uint64
 * @param byteOrder
 * @returns {Buffer}
 */
export function uint64ToBuffer(uint64, byteOrder = BYTE_ORDER_BE) {
  const numbers = Long.fromNumber(uint64, true).toBytes(byteOrder === BYTE_ORDER_LE);
  return Buffer.from(numbers);
}

/**
 * returns a random integer in [min, max].
 * @param min
 * @param max
 * @returns {Number}
 */
export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.ceil(max);
  const random = crypto.randomBytes(1)[0] / (0xff + 1e-13);
  return Math.floor(random * (max - min + 1) + min);
}

/**
 * split buffer into chunks, each chunk size is picked randomly from [min, max]
 * @param buffer
 * @param min
 * @param max
 * @returns {Array<Buffer>}
 */
export function getRandomChunks(buffer, min, max) {
  const totalLen = buffer.length;
  const bufs = [];
  let ptr = 0;
  while (ptr < totalLen - 1) {
    const offset = getRandomInt(min, max);
    bufs.push(buffer.slice(ptr, ptr + offset));
    ptr += offset;
  }
  if (ptr < totalLen) {
    bufs.push(buffer.slice(ptr));
  }
  return bufs;
}

/**
 * split buffer into chunks, the max chunk size is maxSize
 * @param buffer
 * @param maxSize
 * @returns {Array<Buffer>}
 */
export function getChunks(buffer, maxSize) {
  const totalLen = buffer.length;
  const bufs = [];
  let ptr = 0;
  while (ptr < totalLen - 1) {
    bufs.push(buffer.slice(ptr, ptr + maxSize));
    ptr += maxSize;
  }
  if (ptr < totalLen) {
    bufs.push(buffer.slice(ptr));
  }
  return bufs;
}

/**
 * increment buffer by one in big endian.
 * @param buffer
 * @returns {Array<Buffer>}
 */
export function incrementLE(buffer) {
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i]++ !== 255) break;
  }
  return buffer;
}

/**
 * increment buffer by one in little endian.
 * @param buffer
 * @returns {Array<Buffer>}
 */
export function incrementBE(buffer) {
  for (let i = buffer.length - 1; i >= 0; i--) {
    if (buffer[i]++ !== 255) break;
  }
  return buffer;
}
