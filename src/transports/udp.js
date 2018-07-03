import dgram from 'dgram';
import { Inbound, Outbound } from './defs';
import { logger } from '../utils';

export class UdpInbound extends Inbound {

  _socket = null;

  _rinfo = null;

  constructor(props) {
    super(props);
    this._socket = this._conn;
  }

  onReceive = (buffer, rinfo) => {
    this._rinfo = rinfo;
    this.emit('data', buffer);
  };

  write(buffer) {
    const { address, port } = this._rinfo;
    const onSendError = (err) => {
      if (err) {
        logger.warn(`[udp:inbound] [${this.remote}]: ${err.message}`);
      }
    };
    if (this._config.is_client) {
      const isSs = this._config.presets.some(({ name }) => 'ss-base' === name);
      this._socket.send(buffer, port, address, isSs, onSendError);
    } else {
      this._socket.send(buffer, port, address, onSendError);
    }
  }

  close() {
    if (this._socket !== null && this._socket._handle !== null) {
      // NOTE: prevent close shared udp socket
      // this._socket.close();
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
    this._socket = dgram.createSocket('udp4');
    this._socket.on('message', this.onReceive);
  }

  onReceive = (buffer) => {
    this.emit('data', buffer);
  };

  write(buffer) {
    const host = this._targetHost;
    const port = this._targetPort;
    if (host === null || port === null) {
      logger.error('[udp:outbound] fail to send udp data, target address was not initialized.');
    }
    else if (port <= 0 || port >= 65536) {
      logger.error(`[udp:outbound] fail to send udp data, target port "${port}" is invalid.`);
    }
    else {
      this._socket.send(buffer, port, host, (err) => {
        if (err) {
          logger.warn(`[udp:outbound] [${this.remote}]: ${err.message}`);
        }
      });
    }
  }

  connect(host, port) {
    if (this._config.is_client) {
      this._targetHost = this._config.server_host;
      this._targetPort = this._config.server_port;
    } else {
      this._targetHost = host;
      this._targetPort = port;
    }
  }

  close() {
    if (this._socket !== null && this._socket._handle !== null) {
      this._socket.close();
      this._socket = null;
      this.emit('close');
    }
  }

}
