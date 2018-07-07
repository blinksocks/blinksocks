'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Outbound = exports.Inbound = undefined;

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Bound extends _events2.default {

  constructor({ config, source, conn }) {
    super();
    this._config = null;
    this._source = null;
    this._conn = null;
    this._config = config;
    this._source = source;
    this._conn = conn;
  }

  get remoteHost() {
    return this._source.host;
  }

  get remotePort() {
    return this._source.port;
  }

  get remote() {
    return `${this.remoteHost}:${this.remotePort}`;
  }

  get bufferSize() {
    return 0;
  }

  get writable() {
    return true;
  }

  onBroadcast() {}

  write(buffer) {}

  close() {}

}

class Inbound extends Bound {
  constructor(...args) {
    var _temp;

    return _temp = super(...args), this._outbound = null, _temp;
  }

  get name() {
    return 'inbound';
  }

  setOutbound(outbound) {
    this._outbound = outbound;
  }

  getOutbound() {
    return this._outbound;
  }

}

exports.Inbound = Inbound;
class Outbound extends Bound {
  constructor(...args) {
    var _temp2;

    return _temp2 = super(...args), this._inbound = null, _temp2;
  }

  get name() {
    return 'outbound';
  }

  setInbound(inbound) {
    this._inbound = inbound;
  }

  getInbound() {
    return this._inbound;
  }

  async connect() {}

}
exports.Outbound = Outbound;