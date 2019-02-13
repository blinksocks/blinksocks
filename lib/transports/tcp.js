"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TcpOutbound = exports.TcpInbound = void 0;

var _net = _interopRequireDefault(require("net"));

var _defs = require("./defs");

var _utils = require("../utils");

var _acl = require("../core/acl");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const MAX_BUFFERED_SIZE = 512 * 1024;

class TcpInbound extends _defs.Inbound {
  constructor(props) {
    super(props);

    _defineProperty(this, "_socket", null);

    _defineProperty(this, "onError", err => {
      _utils.logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);

      this.emit('_error', err);
    });

    _defineProperty(this, "onReceive", buffer => {
      this.emit('data', buffer);
      const outbound = this.getOutbound();

      if (outbound && outbound.bufferSize > MAX_BUFFERED_SIZE) {
        _utils.logger.debug(`[${this.name}] [${this.remote}] recv paused due to inbound.bufferSize=${outbound.bufferSize} >= ${MAX_BUFFERED_SIZE}`);

        this.pause();
        outbound.once('drain', () => {
          _utils.logger.debug(`[${this.name}] [${this.remote}] resume to recv`);

          this.resume();
        });
      }
    });

    _defineProperty(this, "onDrain", () => {
      this.emit('drain');
    });

    _defineProperty(this, "onTimeout", () => {
      _utils.logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${this._config.timeout / 1e3}s`);

      this.onClose();
    });

    _defineProperty(this, "onHalfClose", () => {
      const outbound = this.getOutbound();

      if (outbound && outbound.end) {
        outbound.end();
      }
    });

    _defineProperty(this, "onClose", () => {
      this.close();
      const outbound = this.getOutbound();

      if (outbound && outbound.close) {
        outbound.close();
        this.setOutbound(null);
      }
    });

    this._socket = this._conn;

    this._socket.on('error', this.onError);

    this._socket.on('data', this.onReceive);

    this._socket.on('drain', this.onDrain);

    this._socket.on('timeout', this.onTimeout);

    this._socket.on('end', this.onHalfClose);

    this._socket.on('close', this.onClose);

    this._socket.setNoDelay(true);

    this._socket.setKeepAlive(true);

    this._socket.setTimeout(this._config.timeout);
  }

  get name() {
    return 'tcp:inbound';
  }

  get bufferSize() {
    return this._socket ? this._socket.bufferSize : 0;
  }

  get writable() {
    return this._socket && !this._socket.destroyed && this._socket.writable;
  }

  write(buffer) {
    if (this.writable) {
      this._socket.write(buffer);
    }
  }

  pause() {
    if (this._socket && !this._socket.destroyed) {
      this._socket.pause();
    }
  }

  resume() {
    if (this._socket && !this._socket.destroyed) {
      this._socket.resume();
    }
  }

  end() {
    this._socket && this._socket.end();
  }

  close() {
    const doClose = () => {
      if (this._socket) {
        this._socket.destroy();

        this._socket = null;
      }

      if (!this._destroyed) {
        this._destroyed = true;
        this.emit('close');
      }
    };

    if (this.bufferSize > 0) {
      this.once('drain', doClose);
    } else {
      doClose();
    }
  }

  onBroadcast(action) {
    switch (action.type) {
      case _acl.ACL_PAUSE_RECV:
        this.pause();
        break;

      case _acl.ACL_RESUME_RECV:
        this.resume();
        break;

      default:
        break;
    }
  }

}

exports.TcpInbound = TcpInbound;

class TcpOutbound extends _defs.Outbound {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "_socket", null);

    _defineProperty(this, "onError", err => {
      _utils.logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);

      this.emit('_error', err);
    });

    _defineProperty(this, "onReceive", buffer => {
      this.emit('data', buffer);
      const inbound = this.getInbound();

      if (inbound && inbound.bufferSize > MAX_BUFFERED_SIZE) {
        _utils.logger.debug(`[${this.name}] [${this.remote}] recv paused due to inbound.bufferSize=${inbound.bufferSize} >= ${MAX_BUFFERED_SIZE}`);

        this.pause();
        inbound.once('drain', () => {
          _utils.logger.debug(`[${this.name}] [${this.remote}] resume to recv`);

          this.resume();
        });
      }
    });

    _defineProperty(this, "onDrain", () => {
      this.emit('drain');
    });

    _defineProperty(this, "onTimeout", () => {
      _utils.logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${this._config.timeout / 1e3}s`);

      this.onClose();
    });

    _defineProperty(this, "onHalfClose", () => {
      const inbound = this.getInbound();

      if (inbound && inbound.end) {
        inbound.end();
      }
    });

    _defineProperty(this, "onClose", () => {
      this.close();
      const inbound = this.getInbound();

      if (inbound && inbound.close) {
        inbound.close();
        this.setInbound(null);
      }
    });
  }

  get name() {
    return 'tcp:outbound';
  }

  get bufferSize() {
    return this._socket ? this._socket.bufferSize : 0;
  }

  get writable() {
    return this._socket && !this._socket.destroyed && this._socket.writable;
  }

  write(buffer) {
    if (this.writable) {
      this._socket.write(buffer);
    }
  }

  pause() {
    if (this._socket && !this._socket.destroyed) {
      this._socket.pause();
    }
  }

  resume() {
    if (this._socket && !this._socket.destroyed) {
      this._socket.resume();
    }
  }

  end() {
    this._socket && this._socket.end();
  }

  close() {
    const doClose = () => {
      if (this._socket) {
        this._socket.destroy();

        this._socket = null;
      }

      if (!this._destroyed) {
        this._destroyed = true;
        this.emit('close');
      }
    };

    if (this.bufferSize > 0) {
      this.once('drain', doClose);
    } else {
      doClose();
    }
  }

  onBroadcast(action) {
    switch (action.type) {
      case _acl.ACL_PAUSE_SEND:
        this.pause();
        break;

      case _acl.ACL_RESUME_SEND:
        this.resume();
        break;

      default:
        break;
    }
  }

  async connect(host, port, force = false) {
    return new Promise(async resolve => {
      if (!this._socket || force) {
        let targetHost, targetPort;

        try {
          const {
            is_server,
            server_host,
            server_port,
            server_pathname
          } = this._config;

          if (is_server) {
            targetHost = host;
            targetPort = port;
          } else {
            targetHost = server_host;
            targetPort = server_port;
          }

          if (this._socket && !this._socket.destroyed) {
            this._socket.destroy();

            this._socket.removeAllListeners();
          }

          this._socket = await this._connect({
            host: targetHost,
            port: targetPort,
            pathname: server_pathname
          });

          this._socket.on('connect', resolve);

          this._socket.on('error', this.onError);

          this._socket.on('end', this.onHalfClose);

          this._socket.on('close', this.onClose);

          this._socket.on('timeout', this.onTimeout);

          this._socket.on('data', this.onReceive);

          this._socket.on('drain', this.onDrain);

          this._socket.setNoDelay(true);

          this._socket.setKeepAlive(true);

          this._socket.setTimeout(this._config.timeout);
        } catch (err) {
          _utils.logger.error(`[${this.name}] [${this.remote}] cannot connect to ${targetHost}:${targetPort}, ${err.message}`);

          this.emit('_error', err);
          this.onClose();
        }
      } else {
        resolve();
      }
    });
  }

  async _connect({
    host,
    port
  }) {
    const ip = await _utils.DNSCache.get(host);

    _utils.logger.info(`[${this.name}] [${this.remote}] connecting to tcp://${host}:${port}` + (_net.default.isIP(host) ? '' : ` resolved=${ip}`));

    return _net.default.connect({
      host: ip,
      port
    });
  }

}

exports.TcpOutbound = TcpOutbound;