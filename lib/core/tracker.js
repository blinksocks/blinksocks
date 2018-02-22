'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Tracker = undefined;

var _filesize = require('filesize');

var _filesize2 = _interopRequireDefault(_filesize);

var _utils = require('../utils');

var _constants = require('../constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const TRACK_CHAR_UPLOAD = 'u';
const TRACK_CHAR_DOWNLOAD = 'd';
const TRACK_MAX_SIZE = 60;

class Tracker {

  constructor({ config, transport, remoteInfo }) {
    this._tracks = [];

    this._config = config;
    this._transport = transport;
    this._sourceHost = remoteInfo.host;
    this._sourcePort = remoteInfo.port;
    this._tracks.push(`${this._sourceHost}:${this._sourcePort}`);
  }

  setTargetAddress(host, port) {
    this._targetHost = host;
    this._targetPort = port;
    this._tracks.push(`${host}:${port}`);
  }

  dump() {
    let strs = [];
    let dp = 0,
        db = 0;
    let up = 0,
        ub = 0;
    let ud = '';
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = this._tracks[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        const el = _step.value;

        if (el === TRACK_CHAR_UPLOAD || el === TRACK_CHAR_DOWNLOAD) {
          if (ud === el) {
            continue;
          }
          ud = el;
        }
        if (Number.isInteger(el)) {
          if (ud === TRACK_CHAR_DOWNLOAD) {
            dp += 1;
            db += el;
          }
          if (ud === TRACK_CHAR_UPLOAD) {
            up += 1;
            ub += el;
          }
        }
        strs.push(el);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    const perSize = Math.floor(TRACK_MAX_SIZE / 2);
    if (strs.length > TRACK_MAX_SIZE) {
      strs = strs.slice(0, perSize).concat([' ... ']).concat(strs.slice(-perSize));
    }
    db = (0, _filesize2.default)(db, { output: 'array' }).join('');
    ub = (0, _filesize2.default)(ub, { output: 'array' }).join('');
    const summary = this._config.is_client ? `out/in = ${up}/${dp}, ${ub}/${db}` : `in/out = ${dp}/${up}, ${db}/${ub}`;
    _utils.logger.info(`[tracker:${this._transport}] summary(${summary}) abstract(${strs.join(' ')})`);
  }

  trace(type, size) {
    if (type === _constants.PIPE_ENCODE) {
      this._tracks.push(TRACK_CHAR_UPLOAD);
      this._tracks.push(size);
    } else {
      this._tracks.push(TRACK_CHAR_DOWNLOAD);
      this._tracks.push(size);
    }
  }

  destroy() {
    if (this._tracks !== null) {
      this.dump();
    }
    this._tracks = null;
  }

}
exports.Tracker = Tracker;