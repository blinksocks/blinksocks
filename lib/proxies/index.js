'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.socks = exports.http = exports.tcp = undefined;

var _tcp = require('./tcp');

var tcp = _interopRequireWildcard(_tcp);

var _http = require('./http');

var http = _interopRequireWildcard(_http);

var _socks = require('./socks');

var socks = _interopRequireWildcard(_socks);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

exports.tcp = tcp;
exports.http = http;
exports.socks = socks;