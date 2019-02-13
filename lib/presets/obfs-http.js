"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _crypto = _interopRequireDefault(require("crypto"));

var _defs = require("./defs");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function parseFile(file) {
  const txt = _fs.default.readFileSync(file, {
    encoding: 'utf-8'
  });

  const lines = txt.split(/\r\n|\n|\r/);
  const parts = [];
  let part = '';

  for (const line of lines) {
    switch (line[0]) {
      case '=':
      case '-':
        if (part !== '') {
          part += '\r\n';
          parts.push(part);
          part = '';
        }

        break;

      default:
        part += line;
        part += '\r\n';
        break;
    }
  }

  const pairs = [];

  for (let i = 0; i < parts.length; i += 2) {
    const prev = parts[i];
    const next = parts[i + 1];
    pairs.push({
      request: Buffer.from(prev),
      response: Buffer.from(next)
    });
  }

  return pairs;
}

class ObfsHttpPreset extends _defs.IPreset {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "_isHeaderSent", false);

    _defineProperty(this, "_isHeaderRecv", false);

    _defineProperty(this, "_response", null);
  }

  static onCheckParams({
    file
  }) {
    if (typeof file !== 'string' || file === '') {
      throw Error('\'file\' must be a non-empty string');
    }
  }

  static onCache({
    file
  }) {
    return {
      pairs: parseFile(file)
    };
  }

  onDestroy() {
    this._response = null;
  }

  clientOut({
    buffer
  }) {
    if (!this._isHeaderSent) {
      const {
        pairs
      } = this.getStore();
      this._isHeaderSent = true;
      const index = _crypto.default.randomBytes(1)[0] % pairs.length;
      const {
        request
      } = pairs[index];
      return Buffer.concat([request, buffer]);
    } else {
      return buffer;
    }
  }

  serverIn({
    buffer,
    fail
  }) {
    if (!this._isHeaderRecv) {
      const found = this.getStore().pairs.find(({
        request
      }) => buffer.indexOf(request) === 0);

      if (found !== undefined) {
        this._isHeaderRecv = true;
        this._response = found.response;
        return buffer.slice(found.request.length);
      } else {
        return fail('http header mismatch');
      }
    } else {
      return buffer;
    }
  }

  serverOut({
    buffer
  }) {
    if (!this._isHeaderSent) {
      this._isHeaderSent = true;
      return Buffer.concat([this._response, buffer]);
    } else {
      return buffer;
    }
  }

  clientIn({
    buffer,
    fail
  }) {
    if (!this._isHeaderRecv) {
      const found = this.getStore().pairs.find(({
        response
      }) => buffer.indexOf(response) === 0);

      if (found !== undefined) {
        this._isHeaderRecv = true;
        return buffer.slice(found.response.length);
      } else {
        return fail('http header mismatch');
      }
    } else {
      return buffer;
    }
  }

}

exports.default = ObfsHttpPreset;