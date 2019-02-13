"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WsOutbound = exports.WsInbound = void 0;

var _ws = _interopRequireDefault(require("ws"));

var _defs = require("./defs");

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const WS_SEND_ARGS = {
  compress: false,
  mask: false,
  binary: true,
  fin: true
};

class WsInbound extends _defs.Inbound {
  constructor(props) {
    super(props);

    _defineProperty(this, "_socket", null);

    _defineProperty(this, "onReceive", buffer => {
      this.emit('data', buffer);
    });

    _defineProperty(this, "onDrain", () => {
      this.emit('drain');
    });

    _defineProperty(this, "onError", err => {
      _utils.logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);

      this.emit('_error', err);
    });

    _defineProperty(this, "onClose", () => {
      this.close();
      const outbound = this.getOutbound();

      if (outbound) {
        outbound.close();
        this.setOutbound(null);
      }
    });

    this._socket = this._conn;

    this._socket._socket.on('drain', this.onDrain);

    this._socket.on('message', this.onReceive);

    this._socket.on('error', this.onError);

    this._socket.on('close', this.onClose);
  }

  get name() {
    return 'ws:inbound';
  }

  get bufferSize() {
    return this._socket ? this._socket.bufferedAmount : 0;
  }

  get writable() {
    return this._socket && this._socket.readyState === _ws.default.OPEN;
  }

  write(buffer) {
    if (this.writable) {
      this._socket.send(buffer, WS_SEND_ARGS);
    }
  }

  close() {
    if (this._socket) {
      this._socket.close();

      this._socket = null;
    }

    if (!this._destroyed) {
      this._destroyed = true;
      this.emit('close');
    }
  }

}

exports.WsInbound = WsInbound;

class WsOutbound extends _defs.Outbound {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "_socket", null);

    _defineProperty(this, "onReceive", buffer => {
      this.emit('data', buffer);
    });

    _defineProperty(this, "onDrain", () => {
      this.emit('drain');
    });

    _defineProperty(this, "onError", err => {
      _utils.logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);

      this.emit('_error', err);
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
    return 'ws:outbound';
  }

  get bufferSize() {
    return this._socket ? this._socket.bufferedAmount : 0;
  }

  get writable() {
    return this._socket && this._socket.readyState === _ws.default.OPEN;
  }

  write(buffer) {
    if (this.writable) {
      this._socket.send(buffer, WS_SEND_ARGS);
    }
  }

  close() {
    if (this._socket) {
      this._socket.close();

      this._socket = null;
    }

    if (!this._destroyed) {
      this._destroyed = true;
      this.emit('close');
    }
  }

  async connect() {
    return new Promise(resolve => {
      if (!this._socket) {
        const {
          server_host,
          server_port,
          server_pathname
        } = this._config;
        const address = this.getConnAddress({
          host: server_host,
          port: server_port,
          pathname: server_pathname
        });

        _utils.logger.info(`[${this.name}] [${this.remote}] connecting to ${address}`);

        try {
          this._socket = new _ws.default(address, this.getConnOptions({
            handshakeTimeout: 1e4,
            perMessageDeflate: false
          }));

          this._socket.on('open', () => {
            this._socket._socket.on('drain', this.onDrain);

            resolve();
          });

          this._socket.on('message', this.onReceive);

          this._socket.on('error', this.onError);

          this._socket.on('close', this.onClose);
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

  getConnAddress({
    host,
    port,
    pathname
  }) {
    return `ws://${host}:${port}` + (pathname ? pathname : '');
  }

  getConnOptions(options) {
    return options;
  }

}

exports.WsOutbound = WsOutbound;