'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TcpOutbound = exports.TcpInbound = undefined;

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _defs = require('./defs');

var _utils = require('../utils');

var _constants = require('../constants');

var _acl = require('../core/acl');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class TcpInbound extends _defs.Inbound {

  constructor(props) {
    super(props);
    this._socket = null;
    this._destroyed = false;
    this.onError = this.onError.bind(this);
    this.onReceive = this.onReceive.bind(this);
    this.onDrain = this.onDrain.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
    this.onHalfClose = this.onHalfClose.bind(this);
    this.onClose = this.onClose.bind(this);
    if (this.ctx.socket) {
      this._socket = this.ctx.socket;
      this._socket.on('error', this.onError);
      this._socket.on('data', this.onReceive);
      this._socket.on('drain', this.onDrain);
      this._socket.on('timeout', this.onTimeout);
      this._socket.on('end', this.onHalfClose);
      this._socket.on('close', this.onClose);
      this._socket.setTimeout && this._socket.setTimeout(this._config.timeout);
    }
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

  onError(err) {
    _utils.logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);
    this.emit('_error', err);
  }

  onReceive(buffer) {
    const direction = this._config.is_client ? _constants.PIPE_ENCODE : _constants.PIPE_DECODE;
    this.ctx.pipe.feed(direction, buffer);

    const outbound = this.getOutbound();
    if (outbound && outbound.bufferSize >= _constants.MAX_BUFFERED_SIZE) {
      _utils.logger.debug(`[${this.name}] [${this.remote}] recv paused due to outbound.bufferSize=${outbound.bufferSize} >= ${_constants.MAX_BUFFERED_SIZE}`);
      this.pause();
      outbound.once('drain', () => {
        if (this._socket && !this._socket.destroyed) {
          _utils.logger.debug(`[${this.name}] [${this.remote}] resume to recv`);
          this.resume();
        }
      });
    }
  }

  onDrain() {
    this.emit('drain');
  }

  onTimeout() {
    _utils.logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${this._config.timeout / 1e3}s`);
    this.onClose();
  }

  onHalfClose() {
    this._outbound && this._outbound.end();
  }

  onClose() {
    this.close();
    if (this._outbound) {
      this._outbound.close();
      this._outbound = null;
    }
  }

  pause() {
    if (this._socket && typeof this._socket.pause === 'function') {
      this._socket.pause();
    }
  }

  resume() {
    if (this._socket && typeof this._socket.resume === 'function') {
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
      case _constants.CONNECT_TO_REMOTE:
        this.pause();
        break;
      case _constants.CONNECTED_TO_REMOTE:
        this.resume();
        break;
      case _constants.PRESET_FAILED:
        this.onPresetFailed(action);
        break;
      case _acl.ACL_CLOSE_CONNECTION:
        _utils.logger.info(`[${this.name}] [${this.remote}] acl request to close connection`);
        this.close();
        break;
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

  async onPresetFailed(action) {
    const { name, message } = action.payload;
    _utils.logger.error(`[${this.name}] [${this.remote}] preset "${name}" fail to process: ${message}`);
    this.emit('_error', new Error(message));

    if (this._config.is_client) {
      _utils.logger.warn(`[${this.name}] [${this.remote}] connection closed`);
      this.onClose();
    }

    if (this._config.is_server && !this._config.mux) {
      if (this._config.redirect) {
        const { orgData } = action.payload;
        const [host, port] = this._config.redirect.split(':');

        _utils.logger.warn(`[${this.name}] [${this.remote}] connection is redirecting to: ${host}:${port}`);

        this.ctx.pipe.updatePresets([]);

        await this._outbound.connect({ host, port: +port });
        if (this._outbound.writable) {
          this._outbound.write(orgData);
        }
      } else {
        this.pause();
        const timeout = (0, _utils.getRandomInt)(10, 40);
        _utils.logger.warn(`[${this.name}] [${this.remote}] connection will be closed in ${timeout}s...`);
        setTimeout(this.onClose, timeout * 1e3);
      }
    }
  }

}

exports.TcpInbound = TcpInbound;
class TcpOutbound extends _defs.Outbound {

  constructor(props) {
    super(props);
    this._socket = null;
    this._destroyed = false;
    this.onError = this.onError.bind(this);
    this.onReceive = this.onReceive.bind(this);
    this.onDrain = this.onDrain.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
    this.onHalfClose = this.onHalfClose.bind(this);
    this.onClose = this.onClose.bind(this);
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

  onError(err) {
    _utils.logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);
    this.emit('_error', err);
  }

  onReceive(buffer) {
    const direction = this._config.is_client ? _constants.PIPE_DECODE : _constants.PIPE_ENCODE;
    this.ctx.pipe.feed(direction, buffer);

    const inbound = this.getInbound();
    if (inbound && inbound.bufferSize >= _constants.MAX_BUFFERED_SIZE) {
      _utils.logger.debug(`[${this.name}] [${this.remote}] recv paused due to inbound.bufferSize=${inbound.bufferSize} >= ${_constants.MAX_BUFFERED_SIZE}`);
      this.pause();
      inbound.once('drain', () => {
        if (this._socket && !this._socket.destroyed) {
          _utils.logger.debug(`[${this.name}] [${this.remote}]  resume to recv`);
          this.resume();
        }
      });
    }
  }

  onDrain() {
    this.emit('drain');
  }

  onTimeout() {
    _utils.logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${this._config.timeout / 1e3}s`);
    this.onClose();
  }

  onHalfClose() {
    this._inbound && this._inbound.end();
  }

  onClose() {
    this.close();
    if (this._inbound) {
      this._inbound.close();
      this._inbound = null;
    }
  }

  pause() {
    if (this._socket && typeof this._socket.pause === 'function') {
      this._socket.pause();
    }
  }

  resume() {
    if (this._socket && typeof this._socket.resume === 'function') {
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
      case _constants.CONNECT_TO_REMOTE:
        this.onConnectToRemote(action);
        break;
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

  async onConnectToRemote(action) {
    const { host, port, keepAlive, onConnected } = action.payload;
    if (!keepAlive || !this._socket) {
      try {
        if (this._config.is_server) {
          await this.connect({ host, port });
        }
        if (this._config.is_client) {
          await this.connect({
            host: this._config.server_host,
            port: this._config.server_port,
            pathname: this._config.server_pathname
          });
        }
        this._socket.on('connect', () => {
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
      } catch (err) {
        _utils.logger.warn(`[${this.name}] [${this.remote}] cannot connect to ${host}:${port}, ${err.message}`);
        this.emit('_error', err);
        this.onClose();
      }
    } else {
      this.broadcast({ type: _constants.CONNECTED_TO_REMOTE, payload: { host, port } });
    }
  }

  async connect(target) {
    if (this._socket && !this._socket.destroyed) {
      this._socket.destroy();
    }
    this._socket = await this._connect(target);
    this._socket.on('error', this.onError);
    this._socket.on('end', this.onHalfClose);
    this._socket.on('close', this.onClose);
    this._socket.on('timeout', this.onTimeout);
    this._socket.on('data', this.onReceive);
    this._socket.on('drain', this.onDrain);
    this._socket.setTimeout(this._config.timeout);
  }

  async _connect({ host, port }) {
    const ip = await _utils.DNSCache.get(host);
    _utils.logger.info(`[${this.name}] [${this.remote}] connecting to tcp://${host}:${port} resolved=${ip}`);
    return _net2.default.connect({ host: ip, port });
  }

}
exports.TcpOutbound = TcpOutbound;