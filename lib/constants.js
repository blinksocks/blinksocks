'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PROTOCOL_DEFAULT_PORTS = exports.MUX_CLOSE_CONN = exports.MUX_DATA_FRAME = exports.MUX_NEW_CONN = exports.CONNECT_TO_REMOTE = exports.PRESET_FAILED = exports.MAX_BUFFERED_SIZE = exports.PIPE_DECODE = exports.PIPE_ENCODE = exports.APP_ID = undefined;

var _crypto = require('./utils/crypto');

const APP_ID = exports.APP_ID = (0, _crypto.randomBytes)(16).toString('hex');
const PIPE_ENCODE = exports.PIPE_ENCODE = 1;
const PIPE_DECODE = exports.PIPE_DECODE = -1;
const MAX_BUFFERED_SIZE = exports.MAX_BUFFERED_SIZE = 512 * 1024;const PRESET_FAILED = exports.PRESET_FAILED = 'PRESET_FAILED';
const CONNECT_TO_REMOTE = exports.CONNECT_TO_REMOTE = 'CONNECT_TO_REMOTE';
const MUX_NEW_CONN = exports.MUX_NEW_CONN = 'MUX_NEW_CONN';
const MUX_DATA_FRAME = exports.MUX_DATA_FRAME = 'MUX_DATA_FRAME';
const MUX_CLOSE_CONN = exports.MUX_CLOSE_CONN = 'MUX_CLOSE_CONN';

const PROTOCOL_DEFAULT_PORTS = exports.PROTOCOL_DEFAULT_PORTS = {
  'ftp:': 21,
  'gopher:': 70,
  'http:': 80,
  'https:': 443,
  'ws:': 80,
  'wss:': 443
};