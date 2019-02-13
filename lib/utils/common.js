"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.numberToBuffer = numberToBuffer;
exports.uint64ToBuffer = uint64ToBuffer;
exports.getRandomInt = getRandomInt;
exports.getRandomChunks = getRandomChunks;
exports.getChunks = getChunks;
exports.incrementLE = incrementLE;
exports.incrementBE = incrementBE;
exports.BYTE_ORDER_LE = exports.BYTE_ORDER_BE = void 0;

var _long = _interopRequireDefault(require("long"));

var crypto = _interopRequireWildcard(require("./crypto"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const BYTE_ORDER_BE = 0;
exports.BYTE_ORDER_BE = BYTE_ORDER_BE;
const BYTE_ORDER_LE = 1;
exports.BYTE_ORDER_LE = BYTE_ORDER_LE;

function numberToBuffer(num, len = 2, byteOrder = BYTE_ORDER_BE) {
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

function uint64ToBuffer(uint64, byteOrder = BYTE_ORDER_BE) {
  const numbers = _long.default.fromNumber(uint64, true).toBytes(byteOrder === BYTE_ORDER_LE);

  return Buffer.from(numbers);
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.ceil(max);
  const random = crypto.randomBytes(1)[0] / (0xff + 1e-13);
  return Math.floor(random * (max - min + 1) + min);
}

function getRandomChunks(buffer, min, max) {
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

function getChunks(buffer, maxSize) {
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

function incrementLE(buffer) {
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i]++ !== 255) break;
  }

  return buffer;
}

function incrementBE(buffer) {
  for (let i = buffer.length - 1; i >= 0; i--) {
    if (buffer[i]++ !== 255) break;
  }

  return buffer;
}