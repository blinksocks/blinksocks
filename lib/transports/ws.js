'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WsOutbound = exports.WsInbound = undefined;

var _ws = require('ws');

var _ws2 = _interopRequireDefault(_ws);

var _tcp = require('./tcp');

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function patchWebsocket(ws) {
  ws.write = buffer => ws.send(buffer, {
    compress: false,
    mask: false,
    fin: true }, () => this.emit('drain'));
  ws.end = () => ws.close();
  ws.destroy = () => ws.close();
  ws.setTimeout = () => {};
  ws.on('open', (...args) => ws.emit('connect', ...args));
  return ws;
}

class WsInbound extends _tcp.TcpInbound {

  constructor(props) {
    super(props);
    if (this._socket) {
      const socket = this._socket;
      socket.on('message', this.onReceive);
      socket.on('close', () => socket.destroyed = true);
      patchWebsocket.call(this, socket);
    }
  }

  get name() {
    return 'ws:inbound';
  }

  get bufferSize() {
    return this._socket ? this._socket.bufferedAmount : 0;
  }

  get writable() {
    return this._socket && this._socket.readyState === _ws2.default.OPEN;
  }

}

exports.WsInbound = WsInbound;
class WsOutbound extends _tcp.TcpOutbound {

  get name() {
    return 'ws:outbound';
  }

  get bufferSize() {
    return this._socket ? this._socket.bufferedAmount : 0;
  }

  get writable() {
    return this._socket && this._socket.readyState === _ws2.default.OPEN;
  }

  async _connect(target) {
    const address = this.getConnAddress(target);
    _utils.logger.info(`[${this.name}] [${this.remote}] connecting to ${address}`);
    const socket = new _ws2.default(address, this.getConnOptions({
      handshakeTimeout: 1e4,
      perMessageDeflate: false
    }));
    socket.on('message', this.onReceive);
    socket.on('close', () => socket.destroyed = true);
    return patchWebsocket.call(this, socket);
  }

  getConnAddress({ host, port, pathname }) {
    return `ws://${host}:${port}` + (pathname ? pathname : '');
  }

  getConnOptions(options) {
    return options;
  }

}
exports.WsOutbound = WsOutbound;