"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AdvancedBuffer = void 0;

var _events = _interopRequireDefault(require("events"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class AdvancedBuffer extends _events.default {
  constructor(options = {}) {
    super();

    _defineProperty(this, "_buffer", Buffer.alloc(0));

    _defineProperty(this, "_getPacketLength", null);

    _defineProperty(this, "_nextLength", 0);

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