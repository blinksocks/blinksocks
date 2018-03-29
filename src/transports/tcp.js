import net from 'net';
import { Inbound, Outbound } from './defs';
import { MAX_BUFFERED_SIZE, PIPE_ENCODE, PIPE_DECODE } from '../constants';
import { DNSCache, logger, getRandomInt } from '../utils';

import {
  ACL_CLOSE_CONNECTION,
  ACL_PAUSE_RECV,
  ACL_PAUSE_SEND,
  ACL_RESUME_RECV,
  ACL_RESUME_SEND,
} from '../core/acl';

import {
  CONNECT_TO_REMOTE,
  CONNECTED_TO_REMOTE,
  PRESET_FAILED,
} from '../presets/actions';

export class TcpInbound extends Inbound {

  _socket = null;

  _destroyed = false;

  constructor(props) {
    super(props);
    this.onError = this.onError.bind(this);
    this.onReceive = this.onReceive.bind(this);
    this.onDrain = this.onDrain.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
    this.onHalfClose = this.onHalfClose.bind(this);
    this.onClose = this.onClose.bind(this);
    if (this.ctx.socket) {
      this._socket = this.ctx.socket;
      this._socket.on('error', this.onError);
      this._socket.on('data', this.onReceive);
      this._socket.on('drain', this.onDrain);
      this._socket.on('timeout', this.onTimeout);
      this._socket.on('end', this.onHalfClose);
      this._socket.on('close', this.onClose);
      this._socket.setTimeout && this._socket.setTimeout(this._config.timeout);
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
    const direction = this._config.is_client ? PIPE_ENCODE : PIPE_DECODE;
    this.ctx.pipe.feed(direction, buffer);
    // throttle receiving data to reduce memory grow:
    // https://github.com/blinksocks/blinksocks/issues/60
    // https://nodejs.org/dist/latest/docs/api/net.html#net_socket_buffersize
    const outbound = this.getOutbound();
    if (outbound && outbound.bufferSize >= MAX_BUFFERED_SIZE) {
      logger.debug(`[${this.name}] [${this.remote}] recv paused due to outbound.bufferSize=${outbound.bufferSize} >= ${MAX_BUFFERED_SIZE}`);
      this._socket.pause();
      outbound.once('drain', () => {
        if (this._socket && !this._socket.destroyed) {
          logger.debug(`[${this.name}] [${this.remote}] resume to recv`);
          this._socket.resume();
        }
      });
    }
  }

  onDrain() {
    this.emit('drain');
  }

  onTimeout() {
    logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${this._config.timeout / 1e3}s`);
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
      case ACL_CLOSE_CONNECTION:
        logger.info(`[${this.name}] [${this.remote}] acl request to close connection`);
        this.close();
        break;
      case ACL_PAUSE_RECV:
        this._socket && this._socket.pause();
        break;
      case ACL_RESUME_RECV:
        this._socket && this._socket.resume();
        break;
      default:
        break;
    }
  }

  async onPresetFailed(action) {
    const { name, message } = action.payload;
    logger.error(`[${this.name}] [${this.remote}] preset "${name}" fail to process: ${message}`);

    // close connection directly on client side
    if (this._config.is_client) {
      logger.warn(`[${this.name}] [${this.remote}] connection closed`);
      this.onClose();
    }

    // for server side, redirect traffic if "redirect" is set, otherwise, close connection after a random timeout
    if (this._config.is_server && !this._config.mux) {
      if (this._config.redirect) {
        const { orgData } = action.payload;
        const [host, port] = this._config.redirect.split(':');

        logger.warn(`[${this.name}] [${this.remote}] connection is redirecting to: ${host}:${port}`);

        // replace presets to tracker only
        this.updatePresets([{ name: 'tracker' }]);

        // connect to "redirect" remote
        await this._outbound.connect({ host, port: +port });
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

}

export class TcpOutbound extends Outbound {

  _socket = null;

  _destroyed = false;

  constructor(props) {
    super(props);
    this.onError = this.onError.bind(this);
    this.onReceive = this.onReceive.bind(this);
    this.onDrain = this.onDrain.bind(this);
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
    const direction = this._config.is_client ? PIPE_DECODE : PIPE_ENCODE;
    this.ctx.pipe.feed(direction, buffer);
    // throttle receiving data to reduce memory grow:
    // https://github.com/blinksocks/blinksocks/issues/60
    // https://nodejs.org/dist/latest/docs/api/net.html#net_socket_buffersize
    const inbound = this.getInbound();
    if (inbound && inbound.bufferSize >= MAX_BUFFERED_SIZE) {
      logger.debug(`[${this.name}] [${this.remote}] recv paused due to inbound.bufferSize=${inbound.bufferSize} >= ${MAX_BUFFERED_SIZE}`);
      this._socket.pause();
      inbound.once('drain', () => {
        if (this._socket && !this._socket.destroyed) {
          logger.debug(`[${this.name}] [${this.remote}]  resume to recv`);
          this._socket.resume();
        }
      });
    }
  }

  onDrain() {
    this.emit('drain');
  }

  onTimeout() {
    logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${this._config.timeout / 1e3}s`);
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
      case ACL_PAUSE_SEND:
        this._socket && this._socket.pause();
        break;
      case ACL_RESUME_SEND:
        this._socket && this._socket.resume();
        break;
      default:
        break;
    }
  }

  async onConnectToRemote(action) {
    const { host, port, keepAlive, onConnected } = action.payload;
    if (!keepAlive || !this._socket) {
      try {
        if (this._config.is_server) {
          await this.connect({ host, port });
        }
        if (this._config.is_client) {
          await this.connect({ host: this._config.server_host, port: this._config.server_port });
        }
        this._socket.on('connect', () => {
          if (typeof onConnected === 'function') {
            try {
              onConnected((buffer) => {
                if (buffer) {
                  const type = this._config.is_client ? PIPE_ENCODE : PIPE_DECODE;
                  this.ctx.pipe.feed(type, buffer, { cid: this.ctx.proxyRequest.cid, host, port });
                }
              });
            } catch (err) {
              logger.error(`[${this.name}] [${this.remote}] onConnected callback error: ${err.message}`);
            }
          }
          this.ctx.pipe.broadcast(null, { type: CONNECTED_TO_REMOTE, payload: { host, port } });
        });
      } catch (err) {
        logger.warn(`[${this.name}] [${this.remote}] cannot connect to ${host}:${port}, ${err.message}`);
        this.onClose();
      }
    } else {
      this.ctx.pipe.broadcast(null, { type: CONNECTED_TO_REMOTE, payload: { host, port } });
    }
  }

  async connect({ host, port }) {
    // close alive connection before create a new one
    if (this._socket && !this._socket.destroyed) {
      this._socket.destroy();
    }
    this._socket = await this._connect({ host, port });
    this._socket.on('error', this.onError);
    this._socket.on('end', this.onHalfClose);
    this._socket.on('close', this.onClose);
    this._socket.on('timeout', this.onTimeout);
    this._socket.on('data', this.onReceive);
    this._socket.on('drain', this.onDrain);
    this._socket.setTimeout(this._config.timeout);
  }

  async _connect({ host, port }) {
    const ip = await DNSCache.get(host);
    logger.info(`[${this.name}] [${this.remote}] connecting to tcp://${host}:${port} resolved=${ip}`);
    return net.connect({ host: ip, port });
  }

}
