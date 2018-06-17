'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Http2Outbound = exports.Http2Inbound = undefined;

var _http = require('http2');

var _http2 = _interopRequireDefault(_http);

var _defs = require('./defs');

var _utils = require('../utils');

var _constants = require('../constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const { HTTP2_HEADER_PATH, HTTP2_HEADER_METHOD } = _http2.default.constants;

class Http2Inbound extends _defs.Inbound {

  constructor(props) {
    super(props);
    this._session = null;
    this._stream = null;
    this._destroyed = false;
    this.onError = this.onError.bind(this);
    this.onReceive = this.onReceive.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
    this.onClose = this.onClose.bind(this);
    if (this.ctx.socket) {
      this._stream = this.ctx.socket;
      this._session = this._stream.session;
      this._stream.on('data', this.onReceive);
      this._session.on('error', this.onError);
      this._session.on('timeout', this.onTimeout);
      this._session.on('close', this.onClose);
      this._session.setTimeout(this._config.timeout);
    }
  }

  get name() {
    return 'h2:inbound';
  }

  get writable() {
    return this._stream && this._stream.writable;
  }

  write(buffer) {
    if (this.writable) {
      this._stream.write(buffer);
    }
  }

  onError(err) {
    _utils.logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);
    this.emit('_error', err);
  }

  onReceive(buffer) {
    const direction = this._config.is_client ? _constants.PIPE_ENCODE : _constants.PIPE_DECODE;
    this.ctx.pipe.feed(direction, buffer);
  }

  onTimeout() {
    _utils.logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${this._config.timeout / 1e3}s`);
    this.onClose();
  }

  onClose() {
    this.close();
    if (this._outbound) {
      this._outbound.close();
      this._outbound = null;
    }
  }

  close() {
    if (this._session) {
      this._session.destroy();
      this._session = null;
    }
    if (!this._destroyed) {
      this._destroyed = true;
      this.emit('close');
    }
  }

}

exports.Http2Inbound = Http2Inbound;
class Http2Outbound extends _defs.Outbound {

  constructor(props) {
    super(props);
    this._session = null;
    this._stream = null;
    this._destroyed = false;
    this.onError = this.onError.bind(this);
    this.onReceive = this.onReceive.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
    this.onClose = this.onClose.bind(this);
  }

  get name() {
    return 'h2:outbound';
  }

  get writable() {
    return this._stream && this._stream.writable;
  }

  write(buffer) {
    if (this.writable) {
      this._stream.write(buffer);
    }
  }

  onError(err) {
    _utils.logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);
    this.emit('_error', err);
  }

  onReceive(buffer) {
    const direction = this._config.is_client ? _constants.PIPE_DECODE : _constants.PIPE_ENCODE;
    this.ctx.pipe.feed(direction, buffer);
  }

  onTimeout() {
    _utils.logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${this._config.timeout / 1e3}s`);
    this.onClose();
  }

  onClose() {
    this.close();
    if (this._inbound) {
      this._inbound.close();
      this._inbound = null;
    }
  }

  close() {
    if (this._session) {
      this._session.destroy();
      this._session = null;
    }
    if (!this._destroyed) {
      this._destroyed = true;
      this.emit('close');
    }
  }

  onBroadcast(action) {
    switch (action.type) {
      case _constants.CONNECT_TO_REMOTE:
        this.onConnectToRemote(action);
        break;
      default:
        break;
    }
  }

  async onConnectToRemote(action) {
    const { host, port, keepAlive, onConnected } = action.payload;
    if (!keepAlive || !this._session) {
      const { server_host, server_port, server_pathname } = this._config;
      try {
        await this.connect({
          host: server_host,
          port: server_port,
          pathname: server_pathname
        });

        this._session.on('connect', () => {
          if (typeof onConnected === 'function') {
            try {
              onConnected(buffer => {
                if (buffer) {
                  const type = this._config.is_client ? _constants.PIPE_ENCODE : _constants.PIPE_DECODE;
                  this.ctx.pipe.feed(type, buffer, { cid: this.ctx.proxyRequest.cid, host, port });
                }
              });
            } catch (err) {
              _utils.logger.error(`[${this.name}] [${this.remote}] onConnected callback error: ${err.message}`);
              this.emit('_error', err);
            }
          }
          this.broadcast({ type: _constants.CONNECTED_TO_REMOTE, payload: { host, port } });
        });

        this._stream = this._session.request({
          [HTTP2_HEADER_METHOD]: 'POST',
          [HTTP2_HEADER_PATH]: server_pathname || '/'
        }, {
          endStream: false
        });
        this._stream.on('error', this.onError);
        this._stream.on('data', this.onReceive);
      } catch (err) {
        _utils.logger.warn(`[${this.name}] [${this.remote}] cannot connect to ${server_host}:${server_port}, ${err.message}`);
        this.emit('_error', err);
        this.onClose();
      }
    } else {
      this.broadcast({ type: _constants.CONNECTED_TO_REMOTE, payload: { host, port } });
    }
  }

  async connect({ host, port, pathname }) {
    if (this._session && !this._session.closed) {
      this._session.destroy();
    }

    const address = `h2://${host}:${port}` + (pathname ? pathname : '');
    _utils.logger.info(`[${this.name}] [${this.remote}] connecting to ${address}`);

    const options = {};
    if (this._config.tls_cert_self_signed) {
      options.ca = this._config.tls_cert;
    }
    this._session = _http2.default.connect(`https://${host}:${port}`, options);
    this._session.on('close', this.onClose);
    this._session.on('timeout', this.onTimeout);
    this._session.on('error', this.onError);
    this._session.setTimeout(this._config.timeout);
  }

}
exports.Http2Outbound = Http2Outbound;