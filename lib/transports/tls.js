"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TlsOutbound = exports.TlsInbound = void 0;

var _tls = _interopRequireDefault(require("tls"));

var _tcp = require("./tcp");

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class TlsInbound extends _tcp.TcpInbound {
  get name() {
    return 'tls:inbound';
  }

  get bufferSize() {
    return super.bufferSize - 1;
  }

}

exports.TlsInbound = TlsInbound;

class TlsOutbound extends _tcp.TcpOutbound {
  get name() {
    return 'tls:outbound';
  }

  get bufferSize() {
    return super.bufferSize - 1;
  }

  async _connect({
    host,
    port
  }) {
    _utils.logger.info(`[tls:outbound] [${this.remote}] connecting to tls://${host}:${port}`);

    const options = {
      host,
      port
    };

    if (this._config.tls_cert_self_signed) {
      options.ca = [this._config.tls_cert];
    }

    return _tls.default.connect(options);
  }

}

exports.TlsOutbound = TlsOutbound;