import net from 'net';
import {Inbound, Outbound} from './defs';
import {PIPE_ENCODE, PIPE_DECODE} from '../core';
import {logger, getRandomInt} from '../utils';
import {
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

  _destroyed = false;

  constructor(props) {
    super(props);
    const {context} = props;
    this.onError = this.onError.bind(this);
    this.onReceive = this.onReceive.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
    this.onHalfClose = this.onHalfClose.bind(this);
    this.onClose = this.onClose.bind(this);
    if (context) {
      this._socket = context;
      this._socket.on('error', this.onError);
      this._socket.on('data', this.onReceive);
      this._socket.on('drain', () => this.emit('drain'));
      this._socket.on('timeout', this.onTimeout);
      this._socket.on('end', this.onHalfClose);
      this._socket.on('close', this.onClose);
      this._socket.setTimeout && this._socket.setTimeout(__TIMEOUT__);
    }
  }

  get name() {
    return 'tcp:inbound';
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

  onError(err) {
    logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);
  }

  onReceive(buffer) {
    const direction = __IS_CLIENT__ ? PIPE_ENCODE : PIPE_DECODE;
    this._pipe.feed(direction, buffer);
    // throttle receiving data to reduce memory grow:
    // https://github.com/blinksocks/blinksocks/issues/60
    // https://nodejs.org/dist/latest/docs/api/net.html#net_socket_buffersize
    const outbound = this.getOutbound();
    if (outbound && outbound.bufferSize >= MAX_BUFFERED_SIZE) {
      logger.debug(`[${this.name}] recv paused due to outbound.bufferSize=${outbound.bufferSize} > ${MAX_BUFFERED_SIZE}`);
      this._socket.pause();
      outbound.once('drain', () => {
        if (this._socket && !this._socket.destroyed) {
          logger.debug(`[${this.name}] resume to recv`);
          this._socket.resume();
        }
      });
    }
  }

  onTimeout() {
    logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${__TIMEOUT__ / 1e3}s`);
    this.onClose();
  }

  onHalfClose() {
    this._outbound && this._outbound.end();
  }

  onClose() {
    this.close();
    if (this._outbound) {
      this._outbound.close();
      this._outbound = null;
    }
  }

  end() {
    this._socket && this._socket.end();
  }

  close() {
    const doClose = () => {
      if (this._socket) {
        this._socket.destroy();
        this._socket = null;
      }
      if (!this._destroyed) {
        this._destroyed = true;
        this.emit('close');
      }
    };
    if (this.bufferSize > 0) {
      this.once('drain', doClose);
    } else {
      doClose();
    }
  }

  onBroadcast(action) {
    switch (action.type) {
      case CONNECT_TO_REMOTE:
        this._socket && this._socket.pause();
        break;
      case CONNECTED_TO_REMOTE:
        this._socket && this._socket.resume();
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
    logger.error(`[${this.name}] [${this.remote}] preset "${name}" fail to process: ${message}`);

    // close connection directly on client side
    if (__IS_CLIENT__) {
      logger.warn(`[${this.name}] [${this.remote}] connection closed`);
      this.onClose();
    }

    // for server side, redirect traffic if "redirect" is set, otherwise, close connection after a random timeout
    if (__IS_SERVER__) {
      if (__REDIRECT__) {
        const {orgData} = action.payload;
        const [host, port] = __REDIRECT__.split(':');

        logger.warn(`[${this.name}] [${this.remote}] connection is redirecting to: ${host}:${port}`);

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
        logger.warn(`[${this.name}] [${this.remote}] connection will be closed in ${timeout}s...`);
        setTimeout(this.onClose, timeout * 1e3);
      }
    }
  }

  onPresetCloseConnection() {
    logger.info(`[${this.name}] [${this.remote}] preset request to close connection`);
    this.close();
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

  _destroyed = false;

  constructor(props) {
    super(props);
    this.onError = this.onError.bind(this);
    this.onReceive = this.onReceive.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
    this.onHalfClose = this.onHalfClose.bind(this);
    this.onClose = this.onClose.bind(this);
  }

  get name() {
    return 'tcp:outbound';
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

  onError(err) {
    logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);
  }

  onReceive(buffer) {
    const direction = __IS_CLIENT__ ? PIPE_DECODE : PIPE_ENCODE;
    this._pipe.feed(direction, buffer);
    // throttle receiving data to reduce memory grow:
    // https://github.com/blinksocks/blinksocks/issues/60
    // https://nodejs.org/dist/latest/docs/api/net.html#net_socket_buffersize
    const inbound = this.getInbound();
    if (inbound && inbound.bufferSize >= MAX_BUFFERED_SIZE) {
      logger.debug(`[${this.name}] recv paused due to inbound.bufferSize=${inbound.bufferSize} > ${MAX_BUFFERED_SIZE}`);
      this._socket.pause();
      inbound.once('drain', () => {
        if (this._socket && !this._socket.destroyed) {
          logger.debug(`[${this.name}] resume to recv`);
          this._socket.resume();
        }
      });
    }
  }

  onTimeout() {
    logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${__TIMEOUT__ / 1e3}s`);
    this.onClose();
  }

  onHalfClose() {
    this._inbound && this._inbound.end();
  }

  onClose() {
    this.close();
    if (this._inbound) {
      this._inbound.close();
      this._inbound = null;
    }
  }

  end() {
    this._socket && this._socket.end();
  }

  close() {
    const doClose = () => {
      if (this._socket) {
        this._socket.destroy();
        this._socket = null;
      }
      if (!this._destroyed) {
        this._destroyed = true;
        this.emit('close');
      }
    };
    if (this.bufferSize > 0) {
      this.once('drain', doClose);
    } else {
      doClose();
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
    if (!keepAlive || !this._socket) {
      try {
        if (__IS_SERVER__) {
          await this.connect({host, port});
        }
        if (__IS_CLIENT__) {
          logger.info(`[${this.name}] [${this.remote}] request: ${host}:${port}`);
          await this.connect({host: __SERVER_HOST__, port: __SERVER_PORT__});
        }
        this._socket.on('connect', () => {
          if (typeof onConnected === 'function') {
            onConnected(this._inbound.onReceive);
          }
          this._pipe.broadcast(null, {type: CONNECTED_TO_REMOTE, payload: {host, port}});
        });
      } catch (err) {
        logger.warn(`[${this.name}] [${this.remote}] cannot connect to ${host}:${port},`, err);
        this.onClose();
      }
    } else {
      this._pipe.broadcast(null, {type: CONNECTED_TO_REMOTE, payload: {host, port}});
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
    }
    this._socket = await this._connect({host, port});
    this._socket.on('error', this.onError);
    this._socket.on('end', this.onHalfClose);
    this._socket.on('close', this.onClose);
    this._socket.on('timeout', this.onTimeout);
    this._socket.on('data', this.onReceive);
    this._socket.on('drain', () => this.emit('drain'));
    this._socket.setTimeout(__TIMEOUT__);
  }

  async _connect({host, port}) {
    const ip = await this._dnsCache.get(host);
    logger.info(`[${this.name}] [${this.remote}] connecting to: ${host}:${port} resolve=${ip}`);
    return net.connect({host: ip, port});
  }

}
