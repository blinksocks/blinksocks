import net from 'net';
import {Inbound, Outbound} from './defs';
import {PIPE_ENCODE, PIPE_DECODE} from '../core';
import {logger, getRandomInt} from '../utils';
import {
  CONNECTION_CLOSED,
  CONNECTION_WILL_CLOSE,
  CONNECT_TO_REMOTE,
  CONNECTED_TO_REMOTE,
  PRESET_FAILED,
  PRESET_CLOSE_CONNECTION,
  PRESET_PAUSE_RECV,
  PRESET_PAUSE_SEND,
  PRESET_RESUME_RECV,
  PRESET_RESUME_SEND
} from '../presets/defs';

const MAX_BUFFERED_SIZE = 512 * 1024; // 512KB

export class TcpInbound extends Inbound {

  _socket = null;

  _isConnectedToRemote = false;

  constructor(props) {
    super(props);
    const {context} = props;
    this.onError = this.onError.bind(this);
    this.onReceive = this.onReceive.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
    this.destroy = this.destroy.bind(this);
    this._socket = context;
    this._socket.on('error', this.onError);
    this._socket.on('data', this.onReceive);
    this._socket.on('drain', () => this.emit('drain'));
    this._socket.on('timeout', this.onTimeout);
    this._socket.on('end', this.destroy);
    this._socket.on('close', this.destroy);
    this._socket.setTimeout(__TIMEOUT__);
  }

  onError(err) {
    logger.warn(`[tcp:inbound] [${this.remote}] ${err.code || ''} - ${err.message}`);
  }

  onReceive(buffer) {
    if (this._outbound.writable || !this._isConnectedToRemote) {
      const direction = __IS_CLIENT__ ? PIPE_ENCODE : PIPE_DECODE;
      this._pipe.feed(direction, buffer);
    }
    // throttle receiving data to reduce memory grow:
    // https://github.com/blinksocks/blinksocks/issues/60
    // https://nodejs.org/dist/latest/docs/api/net.html#net_socket_buffersize
    if (this._outbound && this._outbound.bufferSize >= MAX_BUFFERED_SIZE) {
      logger.debug(`[tcp:inbound] recv paused due to outbound.bufferSize=${this._outbound.bufferSize} > ${MAX_BUFFERED_SIZE}`);
      this._socket.pause();
      this._outbound.once('drain', () => {
        if (this._socket && !this._socket.destroyed) {
          logger.debug('[tcp:inbound] resume to recv');
          this._socket.resume();
        }
      });
    }
  }

  onTimeout() {
    logger.warn(`[tcp:inbound] [${this.remote}] timeout: no I/O on the connection for ${__TIMEOUT__ / 1e3}s`);
    this.destroy();
  }

  get bufferSize() {
    return this._socket ? this._socket.bufferSize : 0;
  }

  get writable() {
    return this._socket && !this._socket.destroyed && this._socket.writable;
  }

  write(buffer) {
    if (this.writable) {
      this._socket.write(buffer);
    }
  }

  destroy() {
    if (this._socket) {
      const payload = {host: this.remoteHost, port: this.remotePort};
      this.broadcast({type: CONNECTION_WILL_CLOSE, payload});
      this._socket.destroy();
      this._socket = null;
      this.emit('close');
      this.broadcast({type: CONNECTION_CLOSED, payload});
    }
    if (this._outbound && !this._outbound.destroying) {
      this._outbound.destroying = true;
      if (this._outbound.bufferSize > 0) {
        this._outbound.once('drain', () => this._outbound.destroy());
      } else {
        this._outbound.destroy();
        this._outbound = null;
      }
    }
  }

  onBroadcast(action) {
    switch (action.type) {
      case CONNECT_TO_REMOTE:
        this._socket && this._socket.pause();
        break;
      case CONNECTED_TO_REMOTE:
        this._socket && this._socket.resume();
        this._isConnectedToRemote = true;
        break;
      case PRESET_FAILED:
        this.onPresetFailed(action);
        break;
      case PRESET_CLOSE_CONNECTION:
        this.onPresetCloseConnection();
        break;
      case PRESET_PAUSE_RECV:
        this.onPresetPauseRecv();
        break;
      case PRESET_RESUME_RECV:
        this.onPresetResumeRecv();
        break;
      default:
        break;
    }
  }

  async onPresetFailed(action) {
    const {name, message} = action.payload;
    logger.error(`[tcp:inbound] [${this.remote}] preset "${name}" fail to process: ${message}`);

    // close connection directly on client side
    if (__IS_CLIENT__) {
      logger.warn(`[tcp:inbound] [${this.remote}] connection closed`);
      this.destroy();
    }

    // for server side, redirect traffic if "redirect" is set, otherwise, close connection after a random timeout
    if (__IS_SERVER__) {
      if (__REDIRECT__) {
        const {orgData} = action.payload;
        const [host, port] = __REDIRECT__.split(':');

        logger.warn(`[tcp:inbound] [${this.remote}] connection is redirecting to: ${host}:${port}`);

        // replace presets to tracker only
        this.updatePresets([{name: 'tracker'}]);

        // connect to "redirect" remote
        await this._outbound.connect({host, port: +port});
        if (this._outbound.writable) {
          this._outbound.write(orgData);
        }
      } else {
        this._socket && this._socket.pause();
        const timeout = getRandomInt(10, 40);
        logger.warn(`[tcp:inbound] [${this.remote}] connection will be closed in ${timeout}s...`);
        setTimeout(this.destroy, timeout * 1e3);
      }
    }
  }

  onPresetCloseConnection() {
    logger.info(`[tcp:inbound] [${this.remote}] preset request to close connection`);
    this.destroy();
  }

  onPresetPauseRecv() {
    __IS_SERVER__ && (this._socket && this._socket.pause())
  }

  onPresetResumeRecv() {
    __IS_SERVER__ && (this._socket && this._socket.resume());
  }

}

export class TcpOutbound extends Outbound {

  _socket = null;

  constructor(props) {
    super(props);
    this.destroy = this.destroy.bind(this);
    this.onError = this.onError.bind(this);
    this.onReceive = this.onReceive.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
  }

  onError(err) {
    logger.warn(`[tcp:outbound] [${this.remote}] ${err.code || ''} - ${err.message}`);
  }

  onReceive(buffer) {
    if (this._inbound.writable) {
      const direction = __IS_CLIENT__ ? PIPE_DECODE : PIPE_ENCODE;
      this._pipe.feed(direction, buffer);
    }
    // throttle receiving data to reduce memory grow:
    // https://github.com/blinksocks/blinksocks/issues/60
    // https://nodejs.org/dist/latest/docs/api/net.html#net_socket_buffersize
    if (this._inbound && this._inbound.bufferSize >= MAX_BUFFERED_SIZE) {
      logger.debug(`[tcp:outbound] recv paused due to inbound.bufferSize=${this._inbound.bufferSize} > ${MAX_BUFFERED_SIZE}`);
      this._socket.pause();
      this._inbound.once('drain', () => {
        if (this._socket && !this._socket.destroyed) {
          logger.debug('[tcp:outbound] resume to recv');
          this._socket.resume();
        }
      });
    }
  }

  onTimeout() {
    logger.warn(`[tcp:outbound] [${this.remote}] timeout: no I/O on the connection for ${__TIMEOUT__ / 1e3}s`);
    this.destroy();
  }

  get bufferSize() {
    return this._socket ? this._socket.bufferSize : 0;
  }

  get writable() {
    return this._socket && !this._socket.destroyed && this._socket.writable;
  }

  write(buffer) {
    if (this.writable) {
      this._socket.write(buffer);
    }
  }

  destroy() {
    if (this._socket) {
      this._socket.destroy();
      this._socket = null;
    }
    if (this._inbound && !this._inbound.destroying) {
      this._inbound.destroying = true;
      if (this._inbound.bufferSize > 0) {
        this._inbound.once('drain', () => this._inbound.destroy());
      } else {
        this._inbound.destroy();
        this._inbound = null;
      }
    }
  }

  onBroadcast(action) {
    switch (action.type) {
      case CONNECT_TO_REMOTE:
        this.onConnectToRemote(action);
        break;
      case PRESET_PAUSE_SEND:
        this.onPresetPauseSend();
        break;
      case PRESET_RESUME_SEND:
        this.onPresetResumeSend();
        break;
      default:
        break;
    }
  }

  async onConnectToRemote(action) {
    const {host, port, keepAlive, onConnected} = action.payload;
    try {
      if (__IS_SERVER__) {
        (!keepAlive || !this._socket) && await this.connect({host, port});
      }
      if (__IS_CLIENT__) {
        !keepAlive && logger.info(`[tcp:outbound] [${this.remote}] request: ${host}:${port}`);
        (!keepAlive || !this._socket) && await this.connect({host: __SERVER_HOST__, port: __SERVER_PORT__});
      }
      this._socket.on('connect', () => {
        if (typeof onConnected === 'function') {
          onConnected(this._inbound.onReceive);
        }
        this._pipe.broadcast(null, {type: CONNECTED_TO_REMOTE, payload: {host, port}});
      });
    } catch (err) {
      logger.warn(`[tcp:outbound] [${this.remote}] fail to connect to ${host}:${port} err=${err.message}`);
      this._inbound.destroy();
    }
  }

  onPresetPauseSend() {
    __IS_SERVER__ && (this._socket && this._socket.pause());
  }

  onPresetResumeSend() {
    __IS_SERVER__ && (this._socket && this._socket.resume());
  }

  async connect({host, port}) {
    // close alive connection before create a new one
    if (this._socket && !this._socket.destroyed) {
      this._socket.destroy();
      this._socket = null;
    }
    this._socket = await this._connect({host, port});
    this._socket.on('error', this.onError);
    this._socket.on('end', this.destroy);
    this._socket.on('close', this.destroy);
    this._socket.on('timeout', this.onTimeout);
    this._socket.on('data', this.onReceive);
    this._socket.on('drain', () => this.emit('drain'));
    this._socket.setTimeout(__TIMEOUT__);
  }

  async _connect({host, port}) {
    const ip = await this._dnsCache.get(host);
    logger.info(`[tcp:outbound] [${this.remote}] connecting to: ${host}:${port} resolve=${ip}`);
    return net.connect({host: ip, port});
  }

}
