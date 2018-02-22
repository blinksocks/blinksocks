'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AdvancedBuffer = undefined;

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class AdvancedBuffer extends _events2.default {

  constructor(options = {}) {
    super();
    this._buffer = Buffer.alloc(0);
    this._getPacketLength = null;
    this._nextLength = 0;
    if (typeof options.getPacketLength !== 'function') {
      throw Error('options.getPacketLength should be a function');
    }
    this._getPacketLength = options.getPacketLength;
  }

  put(chunk, ...args) {
    if (!(chunk instanceof Buffer)) {
      throw Error('chunk must be a Buffer');
    }
    this._buffer = this._digest(Buffer.concat([this._buffer, chunk]), ...args);
  }

  final() {
    return this._buffer;
  }

  clear() {
    this._buffer = Buffer.alloc(0);
  }

  _digest(buffer, ...args) {
    const retVal = this._nextLength || this._getPacketLength(buffer, ...args);

    if (retVal instanceof Buffer) {
      return this._digest(retVal, ...args);
    } else if (retVal === 0 || retVal === undefined) {
        return buffer;
      } else if (retVal < 0) {
          return Buffer.alloc(0);
        }

    if (buffer.length === retVal) {
      this.emit('data', buffer, ...args);
      this._nextLength = 0;
      return Buffer.alloc(0);
    }

    if (buffer.length < retVal) {
      this._nextLength = retVal;

      return buffer;
    }

    if (buffer.length > retVal) {
      this.emit('data', buffer.slice(0, retVal), ...args);

      this._nextLength = 0;

      return this._digest(buffer.slice(retVal), ...args);
    }
  }

}
exports.AdvancedBuffer = AdvancedBuffer;