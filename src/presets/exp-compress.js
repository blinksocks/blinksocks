import zlib from 'zlib';
import {IPreset, CONNECTION_CLOSED, CONNECT_TO_REMOTE} from './defs';
import {logger, getChunks, numberToBuffer, AdvancedBuffer} from '../utils';

const factories = {
  'gzip': [zlib.gzipSync, zlib.gunzipSync],
  'deflate': [zlib.deflateSync, zlib.inflateSync]
};

const DEFAULT_METHOD = 'deflate';
const DEFAULT_THRESHOLD = '5kb';
const DEFAULT_OPTIONS = {};

/**
 * convert a size string to a number of byte
 * @param size
 * @returns {*}
 */
function parseSize(size) {
  const regex = /^(\d+)(b|k|kb|m|mb)$/g;
  const results = regex.exec(size.toLowerCase());
  if (results !== null) {
    const [, num, unit] = results;
    return +num * {
      'b': 1,
      'k': 1024,
      'kb': 1024,
      'm': 1048576,
      'mb': 1048576
    }[unit];
  }
  return null;
}

/**
 * @description
 *   A simple compressor/decompressor using Node.js zlib module.
 *
 * @notice
 *   1. Compress encrypted(randomized) data is stupid and inefficient, thus you SHOULD ONLY compress non-encrypted data.
 *   2. This preset will significantly reduce performance and increase memory usage during data piping.
 *   3. Application data transferred with SSL(via 22, 443 etc) will not be compressed.
 *
 * @params
 *   method(optional): The compression/decompression method, "deflate" or "gzip", default to "deflate".
 *   threshold(optional): The minimal chunk size to be compressed, default to "5kb".
 *   options(optional): The options passed to compression/decompression method, default to {}. see https://nodejs.org/dist/latest/docs/api/zlib.html#zlib_class_options.
 *
 * @examples
 *   {
 *     "name": "exp-compress",
 *     "params": {
 *       "method": "deflate",
 *       "threshold": "5kb",
 *       "options": {}
 *     }
 *   },
 *   // NOTE: put it before any "cipher" preset
 *
 * @protocol
 *
 *   # TCP chunks
 *   +------+----------+
 *   | LEN  |   DATA   |
 *   +------+----------+
 *   |  2   | Variable |
 *   +------+----------+
 *
 * @explain
 *   1. LEN = len(DATA).
 *   2. The max DATA length is limited to 0xFFFF because LEN takes two bytes.
 *   3. Each chunk should have LEN.
 */
export default class ExpCompressPreset extends IPreset {

  _method = '';

  _threshold = 0;

  _options = {};

  _adBuf = null;

  _isTransferSSL = false;

  static checkParams({method = DEFAULT_METHOD, threshold = DEFAULT_THRESHOLD}) {
    const methods = Object.keys(factories);
    if (!methods.includes(method)) {
      throw Error(`'method' must be one of [${methods}]`);
    }
    const minSize = parseSize(threshold);
    if (minSize === null) {
      throw Error(`'threshold': ${threshold} is invalid`);
    }
    if (minSize < 1024) {
      logger.warn('compress chunk less than 1kb can be inefficient');
    }
  }

  constructor({method = DEFAULT_METHOD, threshold = DEFAULT_THRESHOLD, options = DEFAULT_OPTIONS}) {
    super();
    this._method = method;
    this._threshold = parseSize(threshold);
    this._options = options;
    this._adBuf = new AdvancedBuffer({getPacketLength: this.onReceiving.bind(this)});
    this._adBuf.on('data', this.onReceived.bind(this));
  }

  onNotified(action) {
    switch (action.type) {
      case CONNECT_TO_REMOTE:
        this._isTransferSSL = [22, 443].includes(action.payload.port);
        break;
      case CONNECTION_CLOSED:
        logger.debug(`overall compression ratio: ${this._outBytesB / this._outBytesA}`);
        break;
      default:
        break;
    }
  }

  _outBytesA = 0;
  _outBytesB = 0;

  beforeOut({buffer, fail}) {
    const chunks = getChunks(buffer, 0x7fff).map((chunk) => {
      this._outBytesA += chunk.length + 2;
      let _data = chunk;
      let _len = chunk.length;
      if (chunk.length > this._threshold && !this._isTransferSSL) {
        try {
          const compressed = this.compress(buffer);
          if (compressed.length < 0x7fff) {
            _data = compressed;
            _len = _data.length | 0x8000;
          }
        } catch (err) {
          fail(`cannot compress chunk: ${err.message}`);
        }
      }
      return Buffer.concat([numberToBuffer(_len), _data]);
    });
    const data = Buffer.concat(chunks);
    this._outBytesB += data.length;
    return data;
  }

  beforeIn({buffer, next, fail}) {
    this._adBuf.put(buffer, {next, fail});
  }

  onReceiving(buffer) {
    if (buffer.length < 2) {
      return;
    }
    return 2 + (buffer.readUInt16BE(0) & 0x7fff);
  }

  async onReceived(chunk, {next, fail}) {
    const len = chunk.readUInt16BE(0);
    const data = chunk.slice(2);
    if (len >> 15 === 1) {
      try {
        next(this.decompress(data));
      } catch (err) {
        fail(`cannot decompress chunk: ${err.message}`);
      }
    } else {
      next(data);
    }
  }

  compress(buffer) {
    return factories[this._method][0](buffer, this._options);
  }

  decompress(buffer) {
    return factories[this._method][1](buffer, this._options);
  }

}
