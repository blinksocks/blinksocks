import WebSocket from 'ws';
import {Inbound, Outbound} from './defs';
import {MIDDLEWARE_DIRECTION_UPWARD, MIDDLEWARE_DIRECTION_DOWNWARD} from '../core';
import {logger, getRandomInt} from '../utils';
import {
  CONNECT_TO_REMOTE,
  CONNECTION_WILL_CLOSE,
  CONNECTION_CLOSED,
  CONNECTED_TO_REMOTE,
  PRESET_FAILED,
  PRESET_CLOSE_CONNECTION,
  PRESET_PAUSE_SEND,
  PRESET_PAUSE_RECV,
  PRESET_RESUME_SEND,
  PRESET_RESUME_RECV
} from '../presets/defs';

const MAX_BUFFERED_SIZE = 512 * 1024; // 512KB

// TODO: timeout mechanism for websocket

export class WsInbound extends Inbound {

  _ws = null;

  _isConnectedToRemote = false;

  constructor(props) {
    super(props);
    const {context} = props;
    this.destroy = this.destroy.bind(this);
    this.onError = this.onError.bind(this);
    this.onReceive = this.onReceive.bind(this);
    this._ws = context;
    this._ws.on('message', this.onReceive);
    this._ws.on('error', this.onError);
    this._ws.on('close', this.destroy);
  }

  onError(err) {
    logger.warn(`[ws:inbound] [${this.remote}] ${err.code || ''} - ${err.message}`);
  }

  onReceive(buffer) {
    if (this._outbound.writable || !this._isConnectedToRemote) {
      const direction = __IS_CLIENT__ ? MIDDLEWARE_DIRECTION_UPWARD : MIDDLEWARE_DIRECTION_DOWNWARD;
      this._pipe.feed(direction, buffer);
    }
    if (this._outbound && this._outbound.bufferSize >= MAX_BUFFERED_SIZE) {
      logger.debug(`[ws:inbound] recv paused due to outbound.bufferSize=${this._outbound.bufferSize} > ${MAX_BUFFERED_SIZE}`);
      this._ws.pause();
      this._outbound.once('drain', () => {
        if (this._ws) {
          logger.debug('[ws:inbound] resume to recv');
          this._ws.resume();
        }
      });
    }
  }

  get bufferSize() {
    return this._ws ? this._ws.bufferedAmount : 0;
  }

  get writable() {
    return this._ws && this._ws.readyState === WebSocket.OPEN;
  }

  onBroadcast(action) {
    switch (action.type) {
      case CONNECTED_TO_REMOTE:
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
    logger.error(`[ws:inbound] [${this.remote}] preset "${name}" fail to process: ${message}`);

    // close connection directly on client side
    if (__IS_CLIENT__) {
      logger.warn(`[ws:inbound] [${this.remote}] connection closed`);
      this.destroy();
    }

    // for server side, redirect traffic if "redirect" is set, otherwise, close connection after a random timeout
    if (__IS_SERVER__) {
      if (__REDIRECT__) {
        const {orgData} = action.payload;
        const [host, port] = __REDIRECT__.split(':');

        logger.warn(`[ws:inbound] [${this.remote}] connection is redirecting to: ${host}:${port}`);

        // replace presets to tracker only
        this.setPresets((/* prevPresets */) => [{name: 'tracker'}]);

        // connect to "redirect" remote
        await this._outbound.connect({host, port: +port});
        if (this._outbound.writable) {
          this._outbound.write(orgData);
        }
      } else {
        this._ws && this._ws.pause();
        const timeout = getRandomInt(10, 40);
        logger.warn(`[ws:inbound] [${this.remote}] connection will be closed in ${timeout}s...`);
        setTimeout(this.destroy, timeout * 1e3);
      }
    }
  }

  onPresetCloseConnection() {
    logger.info(`[ws:inbound] [${this.remote}] preset request to close connection`);
    this.destroy();
  }

  onPresetPauseRecv() {
    __IS_SERVER__ && (this._ws && this._ws.pause())
  }

  onPresetResumeRecv() {
    __IS_SERVER__ && (this._ws && this._ws.resume());
  }

  write(buffer) {
    if (this.writable) {
      this._ws.send(buffer);
    }
  }

  destroy() {
    if (this._ws) {
      const payload = {host: this.remoteHost, port: this.remotePort};
      this.broadcast({type: CONNECTION_WILL_CLOSE, payload});
      this._ws.close(1000);
      this._ws = null;
      this.emit('close');
      this.broadcast({type: CONNECTION_CLOSED, payload});
    }
    if (this._outbound && !this._outbound.destroying) {
      this._outbound.destroying = true;
      const bufferSize = this._outbound.bufferSize;
      if (bufferSize > 0) {
        this._outbound.once('drain', () => this._outbound.destroy());
      } else {
        this._outbound.destroy();
        this._outbound = null;
      }
    }
  }

}

export class WsOutbound extends Outbound {

  _ws = null;

  constructor(props) {
    super(props);
    this.destroy = this.destroy.bind(this);
    this.onError = this.onError.bind(this);
    this.onReceive = this.onReceive.bind(this);
  }

  onError(err) {
    logger.warn(`[ws:outbound] [${this.remote}] ${err.code || ''} - ${err.message}`);
  }

  onReceive(buffer) {
    if (this._inbound.writable) {
      const direction = __IS_CLIENT__ ? MIDDLEWARE_DIRECTION_DOWNWARD : MIDDLEWARE_DIRECTION_UPWARD;
      this._pipe.feed(direction, buffer);
    }
    if (this._inbound && this._inbound.bufferSize >= MAX_BUFFERED_SIZE) {
      logger.debug(`[ws:outbound] recv paused due to inbound.bufferSize=${this._inbound.bufferSize} > ${MAX_BUFFERED_SIZE}`);
      this._ws.pause();
      this._inbound.once('drain', () => {
        if (this._ws) {
          logger.debug('[ws:outbound] resume to recv');
          this._ws.resume();
        }
      });
    }
  }

  get bufferSize() {
    return this._ws ? this._ws.bufferedAmount : 0;
  }

  get writable() {
    return this._ws && this._ws.readyState === WebSocket.OPEN;
  }

  write(buffer) {
    if (this.writable) {
      this._ws.send(buffer);
    }
  }

  destroy() {
    if (this._ws) {
      this._ws.close(1000);
      this._ws = null;
    }
    if (this._inbound && !this._inbound.destroying) {
      this._inbound.destroying = true;
      const bufferSize = this._inbound.bufferSize;
      if (bufferSize > 0) {
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
    const {host, port, onConnected} = action.payload;
    if (__IS_SERVER__) {
      await this.connect({host, port});
    }
    if (__IS_CLIENT__) {
      logger.info(`[ws:outbound] [${this.remote}] request: ${host}:${port}`);
      await this.connect({host: __SERVER_HOST__, port: __SERVER_PORT__});
    }
    if (typeof onConnected === 'function') {
      onConnected(this._inbound.onReceive);
    }
    this._pipe.broadcast(null, {type: CONNECTED_TO_REMOTE, payload: {host, port}});
  }

  onPresetPauseSend() {
    __IS_SERVER__ && (this._ws && this._ws.pause());
  }

  onPresetResumeSend() {
    __IS_SERVER__ && (this._ws && this._ws.resume());
  }

  async connect({host, port}) {
    let ip = null;
    try {
      ip = await this._dnsCache.get(host);
    } catch (err) {
      logger.error(`[ws:outbound] [${this.remote}] fail to resolve host ${host}: ${err.message}`);
    }
    logger.info(`[ws:outbound] [${this.remote}] connecting to: ws://${host}:${port} resolve=${ip}`);
    return new Promise((resolve) => {
      this._ws = new WebSocket(`ws://${host}:${port}`, {
        perMessageDeflate: false
      });
      this._ws.on('open', () => resolve(this._ws));
      this._ws.on('message', this.onReceive);
      this._ws.on('close', this.destroy);
      this._ws.on('error', this.onError);
    });
  }

}
