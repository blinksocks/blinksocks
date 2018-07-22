import net from 'net';
import { Inbound, Outbound } from './defs';
import { DNSCache, logger } from '../utils';
import {
  ACL_PAUSE_RECV,
  ACL_PAUSE_SEND,
  ACL_RESUME_RECV,
  ACL_RESUME_SEND,
} from '../core/acl';

const MAX_BUFFERED_SIZE = 512 * 1024; // 512KB

export class TcpInbound extends Inbound {

  _socket = null;

  constructor(props) {
    super(props);
    this._socket = this._conn;
    this._socket.on('error', this.onError);
    this._socket.on('data', this.onReceive);
    this._socket.on('drain', this.onDrain);
    this._socket.on('timeout', this.onTimeout);
    this._socket.on('end', this.onHalfClose);
    this._socket.on('close', this.onClose);
    this._socket.setNoDelay(true);
    this._socket.setKeepAlive(true);
    this._socket.setTimeout(this._config.timeout);
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

  onError = (err) => {
    logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);
    this.emit('_error', err);
  };

  onReceive = (buffer) => {
    this.emit('data', buffer);
    // throttle receiving data to reduce memory grow:
    // https://github.com/blinksocks/blinksocks/issues/60
    // https://nodejs.org/dist/latest/docs/api/net.html#net_socket_buffersize
    const outbound = this.getOutbound();
    if (outbound && outbound.bufferSize > MAX_BUFFERED_SIZE) {
      logger.debug(`[${this.name}] [${this.remote}] recv paused due to inbound.bufferSize=${outbound.bufferSize} >= ${MAX_BUFFERED_SIZE}`);
      this.pause();
      outbound.once('drain', () => {
        logger.debug(`[${this.name}] [${this.remote}] resume to recv`);
        this.resume();
      });
    }
  };

  onDrain = () => {
    this.emit('drain');
  };

  onTimeout = () => {
    logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${this._config.timeout / 1e3}s`);
    this.onClose();
  };

  onHalfClose = () => {
    const outbound = this.getOutbound();
    if (outbound && outbound.end) {
      outbound.end();
    }
  };

  onClose = () => {
    this.close();
    const outbound = this.getOutbound();
    if (outbound && outbound.close) {
      outbound.close();
      this.setOutbound(null);
    }
  };

  pause() {
    if (this._socket && !this._socket.destroyed) {
      this._socket.pause();
    }
  }

  resume() {
    if (this._socket && !this._socket.destroyed) {
      this._socket.resume();
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
      case ACL_PAUSE_RECV:
        this.pause();
        break;
      case ACL_RESUME_RECV:
        this.resume();
        break;
      default:
        break;
    }
  }

}

export class TcpOutbound extends Outbound {

  _socket = null;

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

  onError = (err) => {
    logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);
    this.emit('_error', err);
  };

  onReceive = (buffer) => {
    this.emit('data', buffer);
    // throttle receiving data to reduce memory grow:
    // https://github.com/blinksocks/blinksocks/issues/60
    // https://nodejs.org/dist/latest/docs/api/net.html#net_socket_buffersize
    const inbound = this.getInbound();
    if (inbound && inbound.bufferSize > MAX_BUFFERED_SIZE) {
      logger.debug(`[${this.name}] [${this.remote}] recv paused due to inbound.bufferSize=${inbound.bufferSize} >= ${MAX_BUFFERED_SIZE}`);
      this.pause();
      inbound.once('drain', () => {
        logger.debug(`[${this.name}] [${this.remote}] resume to recv`);
        this.resume();
      });
    }
  };

  onDrain = () => {
    this.emit('drain');
  };

  onTimeout = () => {
    logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${this._config.timeout / 1e3}s`);
    this.onClose();
  };

  onHalfClose = () => {
    const inbound = this.getInbound();
    if (inbound && inbound.end) {
      inbound.end();
    }
  };

  onClose = () => {
    this.close();
    const inbound = this.getInbound();
    if (inbound && inbound.close) {
      inbound.close();
      this.setInbound(null);
    }
  };

  pause() {
    if (this._socket && !this._socket.destroyed) {
      this._socket.pause();
    }
  }

  resume() {
    if (this._socket && !this._socket.destroyed) {
      this._socket.resume();
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
      case ACL_PAUSE_SEND:
        this.pause();
        break;
      case ACL_RESUME_SEND:
        this.resume();
        break;
      default:
        break;
    }
  }

  async connect(host, port, force = false) {
    return new Promise(async (resolve) => {
      if (!this._socket || force) {
        let targetHost, targetPort;
        try {
          const { is_server, server_host, server_port, server_pathname } = this._config;
          if (is_server) {
            targetHost = host;
            targetPort = port;
          } else {
            targetHost = server_host;
            targetPort = server_port;
          }
          // close alive connection before create a new one
          if (this._socket && !this._socket.destroyed) {
            this._socket.destroy();
            this._socket.removeAllListeners();
          }
          this._socket = await this._connect({ host: targetHost, port: targetPort, pathname: server_pathname });
          this._socket.on('connect', resolve);
          this._socket.on('error', this.onError);
          this._socket.on('end', this.onHalfClose);
          this._socket.on('close', this.onClose);
          this._socket.on('timeout', this.onTimeout);
          this._socket.on('data', this.onReceive);
          this._socket.on('drain', this.onDrain);
          this._socket.setNoDelay(true);
          this._socket.setKeepAlive(true);
          this._socket.setTimeout(this._config.timeout);
        } catch (err) {
          logger.error(`[${this.name}] [${this.remote}] cannot connect to ${targetHost}:${targetPort}, ${err.message}`);
          this.emit('_error', err);
          this.onClose();
        }
      } else {
        resolve();
      }
    });
  }

  async _connect({ host, port }) {
    const ip = await DNSCache.get(host);
    logger.info(`[${this.name}] [${this.remote}] connecting to tcp://${host}:${port}` + (net.isIP(host) ? '' : ` resolved=${ip}`));
    return net.connect({ host: ip, port });
  }

}
