import net from 'net';
import log4js from 'log4js';
import {Config} from '../Config';
import {Connection} from '../Connection';
import {Crypto} from '../Crypto';
import {Encapsulator} from '../Encapsulator';

const Logger = log4js.getLogger('Relay');

/**
 * return 6 length hash string of a buffer, for debugging
 * @param buffer
 * @returns {string}
 */
function hash(buffer) {
  return Crypto.hash(buffer).slice(0, 6);
}

/**   <- backward                forward ->
 *  +----------------------------------------+
 *  | this._lsocket |  Relay  | this._socket |
 *  +----------------------------------------+
 */
export class Relay {

  _id = null;

  _lsocket = null; // backward net.Socket

  _socket = null; // forward net.Socket

  _cipher = null;

  _decipher = null;

  _isConnected = false;

  constructor(options) {
    Logger.setLevel(Config.log_level);
    this._id = options.id;
    this._lsocket = options.socket;
  }

  // private

  _connect(host, port, callback) {
    this._socket = net.connect({host, port}, () => {
      Logger.info(`[${this._id}] ==> ${host}:${port}`);
      this._isConnected = true;
      if (typeof callback !== 'undefined') {
        callback(this._socket);
      }
    });
    this._socket.on('error', (err) => this.onError({host, port}, err));
    this._socket.on('data', (buffer) => this.onReceiving(buffer));
    this._cipher = Crypto.createCipher((buffer) => this.onReceived(buffer));
    this._decipher = Crypto.createDecipher((buffer) => this.onReceived(buffer));
  }

  connect(conn, callback) {
    const [host, port] = conn.getEndPoint();
    // TODO: cache DNS result for domain host to speed up connecting
    this._connect(host, port, callback);
  }

  onError({host, port}, err) {
    switch (err.code) {
      case 'ECONNREFUSED':
        Logger.warn(`[${this._id}] =x=> ${host}:${port}`);
        break;
      case 'ECONNRESET':
        Logger.warn(`[${this._id}] ${err.message}`);
        break;
      case 'ETIMEDOUT':
        Logger.warn(`[${this._id}] ${err.message}`);
        break;
      case 'EAI_AGAIN':
        Logger.warn(`[${this._id}] ${err.message}`);
        break;
      case 'EPIPE':
        Logger.warn(`[${this._id}] ${err.message}`);
        return;
      default:
        Logger.error(err);
        break;
    }
    if (!this._socket.destroyed) {
      this._socket.end();
    }
    if (!this._lsocket.destroyed) {
      this._lsocket.end();
    }
  }

  onReceiving(buffer) {
    if (Config.isServer) {
      this._cipher.write(buffer);
    } else {
      this._decipher.write(buffer);
    }
  }

  /**
   * backward data via this._lsocket.write()
   * @param buffer
   */
  onReceived(buffer) {
    if (Config.isServer) {
      this.backwardToClient(buffer);
    } else {
      this.backwardToApplication(buffer);
    }
  }

  /**
   * backward data to out client
   * @param encrypted
   */
  backwardToClient(encrypted) {
    // NOTE:
    //   It is not necessary encapsulate a header when backward data to client,
    //   because client only need the payload.
    if (Logger.isInfoEnabled()) {
      const logs = [
        `[${this._id}]`,
        `${encrypted.length} bytes(encrypted,${hash(encrypted)})`
        // `${payload.length} bytes(origin,${hash(payload)})`
      ];
      Logger.info(logs.join(' <-- '));
    }

    this._lsocket.write(encrypted);
  }

  /**
   * backward data to applications
   * @param payload
   */
  backwardToApplication(payload) {
    if (this._lsocket.destroyed) {
      if (Logger.isWarnEnabled()) {
        const logs = [
          `[${this._id}] <-x- `,
          `${payload.length} bytes(decrypted,${hash(payload)})`,
          // `${buffer.length} bytes(encrypted,${hash(buffer)})`
        ];
        Logger.warn(logs.join(''));
      }
    } else {
      if (Logger.isInfoEnabled()) {
        const logs = [
          `[${this._id}]`,
          `${payload.length} bytes(decrypted,${hash(payload)})`,
          // `${buffer.length} bytes(encrypted,${hash(buffer)})`
        ];
        Logger.info(logs.join(' <-- '));
      }
      this._lsocket.write(payload);
    }
  }

  /**
   * forward data to our server
   * @param encrypted
   */
  forwardToServer(encrypted) {
    const _send = (data) => {
      if (Logger.isInfoEnabled()) {
        const logs = [
          `[${this._id}]`,
          // `${buffer.length} bytes(origin,${hash(buffer)})`,
          `${data.length} bytes (+header,encrypted,${hash(data)})`
        ];
        Logger.info(logs.join(' --> '));
      }
      this._socket.write(data);
    };

    // connect to our server if not connected yet
    if (!this._isConnected) {
      // TODO: cache DNS result for domain host to speed up connecting
      this._connect(Config.server_host, Config.server_port, () => {
        _send(encrypted);
      });
      return;
    }
    _send(encrypted);
  }

  /**
   * forward data to real server
   * @param decrypted
   */
  forwardToDst(decrypted) {
    const frame = Encapsulator.unpack(decrypted);
    if (frame === null) {
      if (Logger.isWarnEnabled()) {
        Logger.warn(`[${this._id}] -x-> dropped unidentified packet ${decrypted.length} bytes`);
      }
      return;
    }

    const payload = frame.PAYLOAD;
    const _send = (data) => {
      if (this._socket.destroyed) {
        if (Logger.isWarnEnabled()) {
          const logs = [
            `[${this._id}] -x-> `,
            `${decrypted.length} bytes(decrypted,${hash(decrypted)}) -x-> `,
            `${data.length} bytes(-header,${hash(data)})`
          ];
          Logger.warn(logs.join(''));
        }
        this._lsocket.end();
      } else {
        if (Logger.isInfoEnabled()) {
          const logs = [
            `[${this._id}]`,
            `${decrypted.length} bytes(decrypted,${hash(decrypted)})`,
            `${data.length} bytes(-header,${hash(data)})`
          ];
          Logger.info(logs.join(' --> '));
        }
        this._socket.write(data);
      }
    };

    // connect to real server if not connected yet
    if (!this._isConnected) {
      const conn = new Connection({
        ATYP: frame.ATYP,
        DSTADDR: frame.DSTADDR,
        DSTPORT: frame.DSTPORT
      });
      this.connect(conn, () => {
        // send payload of frame
        _send(payload);
      });
      return;
    }
    _send(payload);
  }

  /**
   * send FIN to the other end
   */
  close() {
    if (this._socket !== null && !this._socket.destroyed) {
      this._socket.end();
    }
  }

}
