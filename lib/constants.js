'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MAX_BUFFERED_SIZE = exports.PIPE_DECODE = exports.PIPE_ENCODE = exports.APP_ID = undefined;

var _crypto = require('./utils/crypto');

const APP_ID = exports.APP_ID = (0, _crypto.randomBytes)(16).toString('hex');
const PIPE_ENCODE = exports.PIPE_ENCODE = 1;
const PIPE_DECODE = exports.PIPE_DECODE = -1;
const MAX_BUFFERED_SIZE = exports.MAX_BUFFERED_SIZE = 512 * 1024;