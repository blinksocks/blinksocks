import dgram from 'dgram';
import {Inbound, Outbound} from './defs';
import {PIPE_ENCODE, PIPE_DECODE} from '../core';
import {CONNECT_TO_REMOTE, CONNECTION_CLOSED, PRESET_FAILED} from '../presets';
import {logger} from '../utils';

export class UdpInbound extends Inbound {

  _socket = null;

  _rinfo = null;

  constructor(props) {
    super(props);
    const {context} = props;
    this.onReceive = this.onReceive.bind(this);
    this.onPresetFailed = this.onPresetFailed.bind(this);
    this._socket = context;
    this._socket.on('packet', this.onReceive);
  }

  onReceive(buffer, rinfo) {
    const type = __IS_CLIENT__ ? PIPE_ENCODE : PIPE_DECODE;
    this._rinfo = rinfo;
    this._pipe.feed(type, buffer);
  }

  onBroadcast(action) {
    switch (action.type) {
      case PRESET_FAILED:
        this.onPresetFailed(action);
        break;
      default:
        break;
    }
  }

  onPresetFailed(action) {
    const {name, message} = action.payload;
    logger.error(`[udp:inbound] [${this.remote}] preset "${name}" fail to process: ${message}`);
    if (this._outbound) {
      this._outbound.destroy();
      this._outbound = null;
    }
    this.emit('close');
    this.broadcast({type: CONNECTION_CLOSED, payload: {host: this.remoteHost, port: this.remotePort}});
  }

  write(buffer) {
    const {address, port} = this._rinfo;
    this._socket.send(buffer, port, address, (err) => {
      if (err) {
        logger.warn(`[udp:inbound] ${this.remote}:`, err);
      }
    });
  }

  destroy() {
    if (this._socket !== null && this._socket._handle !== null) {
      this._socket.close();
      this._socket = null;
      this.emit('close');
    }
  }

}

export class UdpOutbound extends Outbound {

  _socket = null;

  _targetHost = null;

  _targetPort = null;

  constructor(props) {
    super(props);
    this.onReceive = this.onReceive.bind(this);
    this._socket = dgram.createSocket('udp4');
    this._socket.on('message', this.onReceive);
  }

  onReceive(buffer) {
    const type = __IS_CLIENT__ ? PIPE_DECODE : PIPE_ENCODE;
    this._pipe.feed(type, buffer);
  }

  onBroadcast(action) {
    switch (action.type) {
      case CONNECT_TO_REMOTE:
        this.onConnectToRemote(action);
        break;
      default:
        break;
    }
  }

  write(buffer) {
    this._socket.send(buffer, this._targetPort, this._targetHost, (err) => {
      if (err) {
        logger.warn(`[udp:outbound] ${this.remote}:`, err);
      }
    });
  }

  onConnectToRemote(action) {
    if (__IS_CLIENT__) {
      this._targetHost = __SERVER_HOST__;
      this._targetPort = __SERVER_PORT__;
    }
    if (__IS_SERVER__) {
      const {host, port, onConnected} = action.payload;
      this._targetHost = host;
      this._targetPort = port;
      if (typeof onConnected === 'function') {
        onConnected();
      }
    }
  }

  destroy() {
    if (this._socket !== null && this._socket._handle !== null) {
      this._socket.close();
      this._socket = null;
    }
  }

}
