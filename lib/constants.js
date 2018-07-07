'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PROTOCOL_DEFAULT_PORTS = exports.CONNECT_TO_REMOTE = exports.PRESET_FAILED = exports.PIPE_DECODE = exports.PIPE_ENCODE = exports.APP_ID = undefined;

var _crypto = require('./utils/crypto');

const APP_ID = exports.APP_ID = (0, _crypto.randomBytes)(16).toString('hex');
const PIPE_ENCODE = exports.PIPE_ENCODE = 1;
const PIPE_DECODE = exports.PIPE_DECODE = -1;

const PRESET_FAILED = exports.PRESET_FAILED = 'PRESET_FAILED';
const CONNECT_TO_REMOTE = exports.CONNECT_TO_REMOTE = 'CONNECT_TO_REMOTE';

const PROTOCOL_DEFAULT_PORTS = exports.PROTOCOL_DEFAULT_PORTS = {
  'ftp:': 21,
  'gopher:': 70,
  'http:': 80,
  'https:': 443,
  'ws:': 80,
  'wss:': 443,
  'h2:': 443
};