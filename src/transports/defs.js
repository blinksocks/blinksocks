/* eslint-disable no-unused-vars */
import EventEmitter from 'events';
import {DNSCache} from '../core';

class Bound extends EventEmitter {

  _remoteInfo = null;

  constructor({remoteInfo}) {
    super();
    this._remoteInfo = remoteInfo;
  }

  get remoteHost() {
    return this._remoteInfo.host;
  }

  get remotePort() {
    return this._remoteInfo.port;
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

  close() {

  }

  updatePresets(value) {

  }

}

export class Inbound extends Bound {

  _outbound = null; // set by relay

  _pipe = null;

  constructor(props) {
    super(props);
    this._pipe = props.pipe;
  }

  setOutbound(outbound) {
    this._outbound = outbound;
  }

  getOutbound() {
    return this._outbound;
  }

  broadcast(action) {
    !this._pipe.destroyed && this._pipe.broadcast('pipe', action);
  }

}

export class Outbound extends Bound {

  _inbound = null; // set by relay

  _pipe = null;

  _dnsCache = null;

  constructor(props) {
    super(props);
    this._pipe = props.pipe;
    this._dnsCache = new DNSCache({expire: __DNS_EXPIRE__});
  }

  setInbound(inbound) {
    this._inbound = inbound;
  }

  getInbound() {
    return this._inbound;
  }

  broadcast(action) {
    !this._pipe.destroyed && this._pipe.broadcast('pipe', action);
  }

}
