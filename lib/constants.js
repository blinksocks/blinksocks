"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PROTOCOL_DEFAULT_PORTS = exports.CONNECT_TO_REMOTE = exports.PRESET_FAILED = exports.PIPE_DECODE = exports.PIPE_ENCODE = exports.APP_ID = void 0;

var _crypto = require("./utils/crypto");

const APP_ID = (0, _crypto.randomBytes)(16).toString('hex');
exports.APP_ID = APP_ID;
const PIPE_ENCODE = 1;
exports.PIPE_ENCODE = PIPE_ENCODE;
const PIPE_DECODE = -1;
exports.PIPE_DECODE = PIPE_DECODE;
const PRESET_FAILED = 'PRESET_FAILED';
exports.PRESET_FAILED = PRESET_FAILED;
const CONNECT_TO_REMOTE = 'CONNECT_TO_REMOTE';
exports.CONNECT_TO_REMOTE = CONNECT_TO_REMOTE;
const PROTOCOL_DEFAULT_PORTS = {
  'ftp:': 21,
  'gopher:': 70,
  'http:': 80,
  'https:': 443,
  'ws:': 80,
  'wss:': 443,
  'h2:': 443
};
exports.PROTOCOL_DEFAULT_PORTS = PROTOCOL_DEFAULT_PORTS;