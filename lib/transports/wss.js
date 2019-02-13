"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WssOutbound = exports.WssInbound = void 0;

var _ws = require("./ws");

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class WssInbound extends _ws.WsInbound {
  get name() {
    return 'wss:inbound';
  }

}

exports.WssInbound = WssInbound;

class WssOutbound extends _ws.WsOutbound {
  get name() {
    return 'wss:outbound';
  }

  getConnAddress({
    host,
    port,
    pathname
  }) {
    return `wss://${host}:${port}` + (pathname ? pathname : '');
  }

  getConnOptions(options) {
    const _options = _objectSpread({}, options);

    if (this._config.tls_cert_self_signed) {
      _options.ca = [this._config.tls_cert];
    }

    return _options;
  }

}

exports.WssOutbound = WssOutbound;