"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Http2Outbound = exports.Http2Inbound = void 0;

var _defs = require("./defs");

var _utils = require("../utils");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class Http2Inbound extends _defs.Inbound {
  constructor(props) {
    super(props);

    _defineProperty(this, "_stream", null);

    _defineProperty(this, "onError", err => {
      _utils.logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);

      this.emit('_error', err);
    });

    _defineProperty(this, "onReceive", buffer => {
      this.emit('data', buffer);
    });

    _defineProperty(this, "onDrain", () => {
      this.emit('drain');
    });

    _defineProperty(this, "onTimeout", () => {
      _utils.logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${this._config.timeout / 1e3}s`);

      this.onClose();
    });

    _defineProperty(this, "onClose", () => {
      this.close();
      const outbound = this.getOutbound();

      if (outbound) {
        outbound.close();
        this.setOutbound(null);
      }
    });

    this._stream = this._conn;

    this._stream.on('data', this.onReceive);

    this._stream.on('drain', this.onDrain);

    this._stream.on('error', this.onError);

    this._stream.on('close', this.onClose);

    this._stream.on('timeout', this.onTimeout);

    this._stream.setTimeout(this._config.timeout);
  }

  get name() {
    return 'h2:inbound';
  }

  get bufferSize() {
    return this._stream ? this._stream.session.socket.bufferSize : 0;
  }

  get writable() {
    return this._stream && this._stream.writable;
  }

  write(buffer) {
    if (this.writable) {
      this._stream.write(buffer);
    }
  }

  close() {
    if (this._stream) {
      this._stream.close();

      this._stream = null;
    }

    if (!this._destroyed) {
      this._destroyed = true;
      this.emit('close');
    }
  }

}

exports.Http2Inbound = Http2Inbound;

class Http2Outbound extends _defs.Outbound {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "_stream", null);

    _defineProperty(this, "onError", err => {
      _utils.logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);

      this.emit('_error', err);
    });

    _defineProperty(this, "onReceive", buffer => {
      this.emit('data', buffer);
    });

    _defineProperty(this, "onDrain", () => {
      this.emit('drain');
    });

    _defineProperty(this, "onTimeout", () => {
      _utils.logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${this._config.timeout / 1e3}s`);

      this.onClose();
    });

    _defineProperty(this, "onClose", () => {
      this.close();
      const inbound = this.getInbound();

      if (inbound) {
        inbound.close();
        this.setInbound(null);
      }
    });
  }

  get name() {
    return 'h2:outbound';
  }

  get bufferSize() {
    return this._stream ? this._stream.session.socket.bufferSize : 0;
  }

  get writable() {
    return this._stream && this._stream.writable;
  }

  write(buffer) {
    if (this.writable) {
      this._stream.write(buffer);
    }
  }

  close() {
    if (this._stream) {
      this._stream.close();

      this._stream = null;
    }

    if (!this._destroyed) {
      this._destroyed = true;
      this.emit('close');
    }
  }

  async connect() {
    return new Promise(resolve => {
      if (!this._stream) {
        const {
          server_host,
          server_port,
          server_pathname
        } = this._config;
        const address = `h2://${server_host}:${server_port}` + (server_pathname ? server_pathname : '');

        _utils.logger.info(`[${this.name}] [${this.remote}] connecting to ${address}`);

        try {
          const http2 = require('http2');

          const {
            HTTP2_HEADER_PATH,
            HTTP2_HEADER_METHOD
          } = http2.constants;
          const options = {};

          if (this._config.tls_cert_self_signed) {
            options.ca = this._config.tls_cert;
          }

          const session = http2.connect(`https://${server_host}:${server_port}`, options);
          session.on('connect', resolve);
          this._stream = session.request({
            [HTTP2_HEADER_METHOD]: 'POST',
            [HTTP2_HEADER_PATH]: server_pathname || '/'
          }, {
            endStream: false
          });

          this._stream.on('error', this.onError);

          this._stream.on('data', this.onReceive);

          this._stream.on('drain', this.onDrain);

          this._stream.on('timeout', this.onTimeout);

          this._stream.on('close', this.onClose);

          this._stream.setTimeout(this._config.timeout);
        } catch (err) {
          _utils.logger.error(`[${this.name}] [${this.remote}] cannot connect to ${address}, ${err.message}`);

          this.emit('_error', err);
          this.onClose();
        }
      } else {
        resolve();
      }
    });
  }

}

exports.Http2Outbound = Http2Outbound;