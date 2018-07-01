import http2 from 'http2';
import { Inbound, Outbound } from './defs';
import { logger } from '../utils';

const { HTTP2_HEADER_PATH, HTTP2_HEADER_METHOD } = http2.constants;

export class Http2Inbound extends Inbound {

  _session = null;

  _stream = null;

  _destroyed = false;

  constructor(props) {
    super(props);
    this.onError = this.onError.bind(this);
    this.onReceive = this.onReceive.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
    this.onClose = this.onClose.bind(this);
    this._stream = this._conn;
    this._session = this._stream.session;
    this._stream.on('data', this.onReceive);
    this._session.on('error', this.onError);
    this._session.on('timeout', this.onTimeout);
    this._session.on('close', this.onClose);
    this._session.setTimeout(this._config.timeout);
  }

  get name() {
    return 'h2:inbound';
  }

  get writable() {
    return this._stream && this._stream.writable;
  }

  write(buffer) {
    if (this.writable) {
      this._stream.write(buffer);
    }
  }

  onError(err) {
    logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);
    this.emit('_error', err);
  }

  onReceive(buffer) {
    this.emit('data', buffer);
  }

  onTimeout() {
    logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${this._config.timeout / 1e3}s`);
    this.onClose();
  }

  onClose() {
    this.close();
    const outbound = this.getOutbound();
    if (outbound) {
      outbound.close();
      this.setOutbound(null);
    }
  }

  close() {
    if (this._session) {
      this._session.destroy();
      this._session = null;
    }
    if (!this._destroyed) {
      this._destroyed = true;
      this.emit('close');
    }
  }

}

export class Http2Outbound extends Outbound {

  _session = null;

  _stream = null;

  _destroyed = false;

  constructor(props) {
    super(props);
    this.onError = this.onError.bind(this);
    this.onReceive = this.onReceive.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
    this.onClose = this.onClose.bind(this);
  }

  get name() {
    return 'h2:outbound';
  }

  get writable() {
    return this._stream && this._stream.writable;
  }

  write(buffer) {
    if (this.writable) {
      this._stream.write(buffer);
    }
  }

  onError(err) {
    logger.warn(`[${this.name}] [${this.remote}] ${err.message}`);
    this.emit('_error', err);
  }

  onReceive(buffer) {
    this.emit('data', buffer);
  }

  onTimeout() {
    logger.warn(`[${this.name}] [${this.remote}] timeout: no I/O on the connection for ${this._config.timeout / 1e3}s`);
    this.onClose();
  }

  onClose() {
    this.close();
    const inbound = this.getInbound();
    if (inbound) {
      inbound.close();
      this.setInbound(null);
    }
  }

  close() {
    if (this._session) {
      this._session.destroy();
      this._session = null;
    }
    if (!this._destroyed) {
      this._destroyed = true;
      this.emit('close');
    }
  }

  async connect() {
    return new Promise((resolve) => {
      if (!this._session) {
        const { server_host, server_port, server_pathname } = this._config;
        const address = `h2://${server_host}:${server_port}` + (server_pathname ? server_pathname : '');
        logger.info(`[${this.name}] [${this.remote}] connecting to ${address}`);
        try {
          // session
          const options = {};
          if (this._config.tls_cert_self_signed) {
            options.ca = this._config.tls_cert;
          }
          this._session = http2.connect(`https://${server_host}:${server_port}`, options);
          this._session.on('connect', resolve);
          this._session.on('close', this.onClose);
          this._session.on('timeout', this.onTimeout);
          this._session.on('error', this.onError);
          this._session.setTimeout(this._config.timeout);
          // stream
          this._stream = this._session.request({
            [HTTP2_HEADER_METHOD]: 'POST',
            [HTTP2_HEADER_PATH]: server_pathname || '/',
          }, {
            endStream: false,
          });
          this._stream.on('error', this.onError);
          this._stream.on('data', this.onReceive);
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
