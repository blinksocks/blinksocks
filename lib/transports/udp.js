'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UdpOutbound = exports.UdpInbound = undefined;

var _dgram = require('dgram');

var _dgram2 = _interopRequireDefault(_dgram);

var _defs = require('./defs');

var _constants = require('../constants');

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class UdpInbound extends _defs.Inbound {

  constructor(props) {
    super(props);
    this._socket = null;
    this._rinfo = null;
    this.onReceive = this.onReceive.bind(this);
    this._socket = this.ctx.socket;
  }

  onReceive(buffer, rinfo) {
    const type = this._config.is_client ? _constants.PIPE_ENCODE : _constants.PIPE_DECODE;
    this._rinfo = rinfo;
    this.ctx.pipe.feed(type, buffer);
  }

  write(buffer) {
    const { address, port } = this._rinfo;
    const onSendError = err => {
      if (err) {
        _utils.logger.warn(`[udp:inbound] [${this.remote}]: ${err.message}`);
      }
    };
    if (this._config.is_client) {
      const isSs = this.ctx.rawPresets.some(({ name }) => 'ss-base' === name);
      this._socket.send(buffer, port, address, isSs, onSendError);
    } else {
      this._socket.send(buffer, port, address, onSendError);
    }
  }

  close() {
    if (this._socket !== null && this._socket._handle !== null) {
      this._socket = null;
      this.emit('close');
    }
  }

}

exports.UdpInbound = UdpInbound;
class UdpOutbound extends _defs.Outbound {

  constructor(props) {
    super(props);
    this._socket = null;
    this._targetHost = null;
    this._targetPort = null;
    this.onReceive = this.onReceive.bind(this);
    this._socket = _dgram2.default.createSocket('udp4');
    this._socket.on('message', this.onReceive);
  }

  onReceive(buffer) {
    const type = this._config.is_client ? _constants.PIPE_DECODE : _constants.PIPE_ENCODE;
    this.ctx.pipe.feed(type, buffer);
  }

  onBroadcast(action) {
    switch (action.type) {
      case _constants.CONNECT_TO_REMOTE:
        if (this._targetHost === null && this._targetPort === null) {
          this.onConnectToRemote(action);
        }
        break;
      default:
        break;
    }
  }

  write(buffer) {
    const host = this._targetHost;
    const port = this._targetPort;
    if (host === null || port === null) {
      _utils.logger.error('[udp:outbound] fail to send udp data, target address was not initialized.');
    } else if (port <= 0 || port >= 65536) {
      _utils.logger.error(`[udp:outbound] fail to send udp data, target port "${port}" is invalid.`);
    } else {
      this._socket.send(buffer, port, host, err => {
        if (err) {
          _utils.logger.warn(`[udp:outbound] [${this.remote}]: ${err.message}`);
        }
      });
    }
  }

  onConnectToRemote(action) {
    const { host, port, onConnected } = action.payload;
    if (this._config.is_client) {
      this._targetHost = this._config.server_host;
      this._targetPort = this._config.server_port;
    }
    if (this._config.is_server) {
      this._targetHost = host;
      this._targetPort = port;
      if (typeof onConnected === 'function') {
        onConnected();
      }
    }
  }

  close() {
    if (this._socket !== null && this._socket._handle !== null) {
      this._socket.close();
      this._socket = null;
      this.emit('close');
    }
  }

}
exports.UdpOutbound = UdpOutbound;