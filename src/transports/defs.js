/* eslint-disable no-unused-vars */
import EventEmitter from 'events';
import {DNSCache} from '../core';

class Bound extends EventEmitter {

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

  destroy() {

  }

  updatePresets(value) {

  }

}

export class Inbound extends Bound {

  _outbound = null; // set by relay

  _pipe = null;

  constructor({context, pipe, isMux}) {
    super();
    this._isMux = isMux;
    this._pipe = pipe;
    this._remoteHost = context ? context.remoteAddress : '?';
    this._remotePort = context ? context.remotePort : '?';
  }

  get remote() {
    return `${this._remoteHost}:${this._remotePort}`;
  }

  get remoteHost() {
    return this._remoteHost;
  }

  get remotePort() {
    return this._remotePort;
  }

  setOutbound(outbound) {
    this._outbound = outbound;
  }

  broadcast(action) {
    !this._pipe.destroyed && this._pipe.broadcast('pipe', action);
  }

}

export class Outbound extends Bound {

  _inbound = null;

  _pipe = null;

  _dnsCache = null;

  constructor({inbound, pipe, isMux}) {
    super();
    this._inbound = inbound;
    this._isMux = isMux;
    this._pipe = pipe;
    this._dnsCache = new DNSCache({expire: __DNS_EXPIRE__});
  }

  get remote() {
    return this._inbound.remote;
  }

  broadcast(action) {
    !this._pipe.destroyed && this._pipe.broadcast('pipe', action);
  }

}
