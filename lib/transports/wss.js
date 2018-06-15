'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WssOutbound = exports.WssInbound = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _ws = require('./ws');

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

  getConnAddress({ host, port, pathname }) {
    return `wss://${host}:${port}` + (pathname ? pathname : '');
  }

  getConnOptions(options) {
    const _options = _extends({}, options);
    if (this._config.tls_cert_self_signed) {
      _options.ca = [this._config.tls_cert];
    }
    return _options;
  }

}
exports.WssOutbound = WssOutbound;