// import http2 from 'http2';
import { Inbound, Outbound } from './defs';
import { logger } from '../utils';

export class Http2Inbound extends Inbound {

  _stream = null;

  constructor(props) {
    super(props);
    this._stream = this._conn;
    this._stream.on('data', this.onReceive);
    this._stream.on('drain', this.onDrain);
    this._stream.on('error', this.onError);
    this._stream.on('close', this.onClose);
    this._stream.on('timeout', this.onTimeout);
    this._stream.setTimeout(this._config.timeout);
  }

  get name() {
    return 'h2:inbound';
  }

  get bufferSize() {
    return this._stream ? this._stream.session.socket.bufferSize : 0;
  }

  get writable() {
    return this._stream && this._stream.writable;
  }

  write(buffer) {
    if (this.writable) {
      this._stream.write(buffer);
    }
  }

  onError = (err) => {
    logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);
    this.emit('_error', err);
  };

  onReceive = (buffer) => {
    this.emit('data', buffer);
  };

  onDrain = () => {
    this.emit('drain');
  };

  onTimeout = () => {
    logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${this._config.timeout / 1e3}s`);
    this.onClose();
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
    if (this._stream) {
      this._stream.close();
      this._stream = null;
    }
    if (!this._destroyed) {
      this._destroyed = true;
      this.emit('close');
    }
  }

}

export class Http2Outbound extends Outbound {

  _stream = null;

  get name() {
    return 'h2:outbound';
  }

  get bufferSize() {
    return this._stream ? this._stream.session.socket.bufferSize : 0;
  }

  get writable() {
    return this._stream && this._stream.writable;
  }

  write(buffer) {
    if (this.writable) {
      this._stream.write(buffer);
    }
  }

  onError = (err) => {
    logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);
    this.emit('_error', err);
  };

  onReceive = (buffer) => {
    this.emit('data', buffer);
  };

  onDrain = () => {
    this.emit('drain');
  };

  onTimeout = () => {
    logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${this._config.timeout / 1e3}s`);
    this.onClose();
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
    if (this._stream) {
      this._stream.close();
      this._stream = null;
    }
    if (!this._destroyed) {
      this._destroyed = true;
      this.emit('close');
    }
  }

  async connect() {
    return new Promise((resolve) => {
      if (!this._stream) {
        const { server_host, server_port, server_pathname } = this._config;
        const address = `h2://${server_host}:${server_port}` + (server_pathname ? server_pathname : '');
        logger.info(`[${this.name}] [${this.remote}] connecting to ${address}`);
        try {
          const http2 = require('http2');
          const { HTTP2_HEADER_PATH, HTTP2_HEADER_METHOD } = http2.constants;
          const options = {};
          if (this._config.tls_cert_self_signed) {
            options.ca = this._config.tls_cert;
          }
          const session = http2.connect(`https://${server_host}:${server_port}`, options);
          session.on('connect', resolve);
          this._stream = session.request({
            [HTTP2_HEADER_METHOD]: 'POST',
            [HTTP2_HEADER_PATH]: server_pathname || '/',
          }, {
            endStream: false,
          });
          this._stream.on('error', this.onError);
          this._stream.on('data', this.onReceive);
          this._stream.on('drain', this.onDrain);
          this._stream.on('timeout', this.onTimeout);
          this._stream.on('close', this.onClose);
          this._stream.setTimeout(this._config.timeout);
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

}
