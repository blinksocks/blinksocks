"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UdpOutbound = exports.UdpInbound = void 0;

var _dgram = _interopRequireDefault(require("dgram"));

var _defs = require("./defs");

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class UdpInbound extends _defs.Inbound {
  constructor(props) {
    super(props);

    _defineProperty(this, "_socket", null);

    _defineProperty(this, "_rinfo", null);

    _defineProperty(this, "onReceive", (buffer, rinfo) => {
      this._rinfo = rinfo;
      this.emit('data', buffer);
    });

    this._socket = this._conn;
  }

  write(buffer) {
    const {
      address,
      port
    } = this._rinfo;

    const onSendError = err => {
      if (err) {
        _utils.logger.warn(`[udp:inbound] [${this.remote}]: ${err.message}`);
      }
    };

    if (this._config.is_client) {
      const isSs = this._config.presets.some(({
        name
      }) => 'ss-base' === name);

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

    _defineProperty(this, "_socket", null);

    _defineProperty(this, "_targetHost", null);

    _defineProperty(this, "_targetPort", null);

    _defineProperty(this, "onReceive", buffer => {
      this.emit('data', buffer);
    });

    this._socket = _dgram.default.createSocket('udp4');

    this._socket.on('message', this.onReceive);
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

  connect(host, port) {
    if (this._config.is_client) {
      this._targetHost = this._config.server_host;
      this._targetPort = this._config.server_port;
    } else {
      this._targetHost = host;
      this._targetPort = port;
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