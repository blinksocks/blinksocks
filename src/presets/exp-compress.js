import zlib from 'zlib';
import {logger} from '../utils';
import {IPreset, CONNECTION_CLOSED} from './defs';

const factories = {
  'gzip': [zlib.createGzip, zlib.createGunzip],
  'deflate': [zlib.createDeflate, zlib.createInflate]
};

const options = {
  flush: zlib.Z_PARTIAL_FLUSH
};

/**
 * @description
 *   A simple compressor/decompressor using Node.js zlib module with default options.
 *
 * @note
 *   1. Compress encrypted(randomized) data is considered stupid and inefficient.
 *   2. You SHOULD ONLY use this preset to compress non-encryption data.
 *   3. Using this preset will **significantly reduce** performance and increase memory usage during data piping.
 *
 * @params
 *   method: The compression/decompression method, "deflate" or "gzip"
 *
 * @examples
 *   {
 *     // - after any "base" preset
 *     "name": "exp-compress",
 *     "params": {
 *       "method": "deflate"
 *     },
 *     // - before any "cipher" preset
 *   }
 */
export default class ExpCompressPreset extends IPreset {

  _method = '';

  _compressor = null;

  _decompressor = null;

  constructor({method}) {
    super();
    const methods = Object.keys(factories);
    if (!methods.includes(method)) {
      throw Error(`'method' must be one of [${methods}]`);
    }
    this._method = method;
  }

  onNotified(action) {
    if (action.type === CONNECTION_CLOSED) {
      logger.debug(`compression ratio: ${this._outBytesB / this._outBytesA}`);
      logger.debug(`decompression ratio: ${this._inBytesB / this._inBytesA}`);
    }
  }

  _outBytesA = 0;
  _outBytesB = 0;

  beforeOut({buffer, next, fail}) {
    if (this._compressor === null) {
      this._compressor = factories[this._method][0](options);
      this._compressor.on('error', (err) => fail(err.message));
      this._compressor.on('data', (buf) => {
        this._outBytesB += buf.length;
        next(buf);
      });
    }
    this._compressor.write(buffer);
    this._outBytesA += buffer.length;
  }

  _inBytesA = 0;
  _inBytesB = 0;

  beforeIn({buffer, next, fail}) {
    if (this._decompressor === null) {
      this._decompressor = factories[this._method][1](options);
      this._decompressor.on('error', (err) => fail(err.message));
      this._decompressor.on('data', (buf) => {
        this._inBytesB += buf.length;
        next(buf);
      });
    }
    this._decompressor.write(buffer);
    this._inBytesA += buffer.length;
  }

}
