import WebSocket from 'ws';
import { Inbound, Outbound } from './defs';
import { logger } from '../utils';

const WS_SEND_ARGS = {
  compress: false,
  mask: false,
  binary: true,
  fin: true,
};

export class WsInbound extends Inbound {

  _socket = null;

  constructor(props) {
    super(props);
    this._socket = this._conn;
    this._socket._socket.on('drain', this.onDrain);
    this._socket.on('message', this.onReceive);
    this._socket.on('error', this.onError);
    this._socket.on('close', this.onClose);
  }

  get name() {
    return 'ws:inbound';
  }

  get bufferSize() {
    return this._socket ? this._socket.bufferedAmount : 0;
  }

  get writable() {
    return this._socket && this._socket.readyState === WebSocket.OPEN;
  }

  write(buffer) {
    if (this.writable) {
      this._socket.send(buffer, WS_SEND_ARGS);
    }
  }

  onReceive = (buffer) => {
    this.emit('data', buffer);
  };

  onDrain = () => {
    this.emit('drain');
  };

  onError = (err) => {
    logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);
    this.emit('_error', err);
  };

  onClose = () => {
    this.close();
    const outbound = this.getOutbound();
    if (outbound) {
      outbound.close();
      this.setOutbound(null);
    }
  };

  close() {
    if (this._socket) {
      this._socket.close();
      this._socket = null;
    }
    if (!this._destroyed) {
      this._destroyed = true;
      this.emit('close');
    }
  }

}

export class WsOutbound extends Outbound {

  _socket = null;

  get name() {
    return 'ws:outbound';
  }

  get bufferSize() {
    return this._socket ? this._socket.bufferedAmount : 0;
  }

  get writable() {
    return this._socket && this._socket.readyState === WebSocket.OPEN;
  }

  write(buffer) {
    if (this.writable) {
      this._socket.send(buffer, WS_SEND_ARGS);
    }
  }

  onReceive = (buffer) => {
    this.emit('data', buffer);
  };

  onDrain = () => {
    this.emit('drain');
  };

  onError = (err) => {
    logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);
    this.emit('_error', err);
  };

  onClose = () => {
    this.close();
    const inbound = this.getInbound();
    if (inbound) {
      inbound.close();
      this.setInbound(null);
    }
  };

  close() {
    if (this._socket) {
      this._socket.close();
      this._socket = null;
    }
    if (!this._destroyed) {
      this._destroyed = true;
      this.emit('close');
    }
  }

  async connect() {
    return new Promise((resolve) => {
      if (!this._socket) {
        const { server_host, server_port, server_pathname } = this._config;
        const address = this.getConnAddress({ host: server_host, port: server_port, pathname: server_pathname });
        logger.info(`[${this.name}] [${this.remote}] connecting to ${address}`);
        try {
          this._socket = new WebSocket(address, this.getConnOptions({
            handshakeTimeout: 1e4, // 10s
            perMessageDeflate: false,
          }));
          this._socket.on('open', () => {
            this._socket._socket.on('drain', this.onDrain);
            resolve();
          });
          this._socket.on('message', this.onReceive);
          this._socket.on('error', this.onError);
          this._socket.on('close', this.onClose);
        } catch (err) {
          logger.error(`[${this.name}] [${this.remote}] cannot connect to ${address}, ${err.message}`);
          this.emit('_error', err);
          this.onClose();
        }
      } else {
        resolve();
      }
    });
  }

  getConnAddress({ host, port, pathname }) {
    return `ws://${host}:${port}` + (pathname ? pathname : '');
  }

  getConnOptions(options) {
    return options;
  }

}
