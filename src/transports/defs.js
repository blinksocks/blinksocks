/* eslint-disable no-unused-vars */
import EventEmitter from 'events';

// .on('_error')
// .on('data')
// .on('close')
class Bound extends EventEmitter {

  _config = null;

  _source = null;

  _conn = null;

  _destroyed = false;

  constructor({ config, source, conn }) {
    super();
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

  onBroadcast() {

  }

  write(buffer) {

  }

  close() {

  }

}

export class Inbound extends Bound {

  _outbound = null; // set by relay

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

export class Outbound extends Bound {

  _inbound = null; // set by relay

  get name() {
    return 'outbound';
  }

  setInbound(inbound) {
    this._inbound = inbound;
  }

  getInbound() {
    return this._inbound;
  }

  async connect() {

  }

}
