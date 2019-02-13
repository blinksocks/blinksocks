"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Outbound = exports.Inbound = void 0;

var _events = _interopRequireDefault(require("events"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class Bound extends _events.default {
  constructor({
    config,
    source,
    conn
  }) {
    super();

    _defineProperty(this, "_config", null);

    _defineProperty(this, "_source", null);

    _defineProperty(this, "_conn", null);

    _defineProperty(this, "_destroyed", false);

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

  get destroyed() {
    return this._destroyed;
  }

  onBroadcast() {}

  write(buffer) {}

  close() {}

}

class Inbound extends Bound {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "_outbound", null);
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
    super(...args);

    _defineProperty(this, "_inbound", null);
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