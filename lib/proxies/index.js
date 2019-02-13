"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.socks = exports.http = exports.tcp = void 0;

var tcp = _interopRequireWildcard(require("./tcp"));

exports.tcp = tcp;

var http = _interopRequireWildcard(require("./http"));

exports.http = http;

var socks = _interopRequireWildcard(require("./socks"));

exports.socks = socks;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }