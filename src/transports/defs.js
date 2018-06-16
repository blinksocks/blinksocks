/* eslint-disable no-unused-vars */
import EventEmitter from 'events';

class Bound extends EventEmitter {

  _ctx = null;

  _config = null;

  constructor({ config, context }) {
    super();
    this._config = config;
    this._ctx = context;
  }

  get ctx() {
    return this._ctx;
  }

  get remoteHost() {
    return this.ctx.sourceAddress.host;
  }

  get remotePort() {
    return this.ctx.sourceAddress.port;
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

  onBroadcast() {

  }

  write(buffer) {

  }

  end() {

  }

  close() {

  }

  broadcast(action) {
    const { relay } = this.ctx;
    if (!relay.destroyed) {
      relay.onBroadcast(action);
    }
  }

}

export class Inbound extends Bound {

  _outbound = null; // set by relay

  setOutbound(outbound) {
    this._outbound = outbound;
  }

  getOutbound() {
    return this._outbound;
  }

}

export class Outbound extends Bound {

  _inbound = null; // set by relay

  setInbound(inbound) {
    this._inbound = inbound;
  }

  getInbound() {
    return this._inbound;
  }

}
