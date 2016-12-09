import net from 'net';
import log4js from 'log4js';
import {Config} from '../Config';
import {Connection} from '../Connection';
import {Crypto} from '../Crypto';
import {Encapsulator} from '../Encapsulator';
import {AdvancedBuffer} from '../AdvancedBuffer';
// import {Tracer} from '../Tracer';

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

  _connection = null; // only available on client-side, will be packed in every out packet

  _buffer = new AdvancedBuffer({
    getPacketLength: function (bytes) {
      return Crypto.decrypt(bytes).readUIntBE(0, bytes.length);
    }
  });

  _isConnected = false;

  constructor(options) {
    Logger.setLevel(Config.log_level);
    this._id = options.id;
    this._lsocket = options.socket;
  }

  setConnection(connection) {
    this._connection = connection;
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
    this._socket.on('error', (err) => {
      this.onError({host, port}, err);
      // callback(null);
    });
    this._socket.on('data', (buffer) => this.onReceiving(buffer));
    this._buffer.on('data', (buffer) => this.onReceived(buffer));
  }

  connect(conn, callback) {
    const [host, port] = conn.getEndPoint();
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
      this.onReceived(buffer);
    } else {
      // Tracer.dump(`Relay_${this._id}_en`, buffer);

      // NOTE: DO NOT decrypt the buffer(chunk) at once, or AES decryption will fail.
      this._buffer.put(buffer);
    }
  }

  /**
   * send data backward via this._lsocket.write()
   * @param buffer
   */
  onReceived(buffer) {
    if (Config.isServer) {
      const encrypted = Crypto.encrypt(Encapsulator.pack(new Connection(), buffer).toBuffer());
      Logger.info(`[${this._id}] <-- ${encrypted.length} bytes (+header,encrypted,hash=${hash(encrypted)}) <-- ${buffer.length} bytes(origin,hash=${hash(buffer)})`);
      this._lsocket.write(encrypted);
      // Tracer.dump(`Relay_${this._id}_en`, encrypted);
    } else {
      const decrypted = Crypto.decrypt(buffer);
      const frame = Encapsulator.unpack(decrypted);
      if (frame === null) {
        Logger.warn(`[${this._id}] <-x- dropped unidentified packet ${buffer.length} bytes`);
        return;
      }
      const payload = frame.PAYLOAD;
      if (this._lsocket.destroyed) {
        Logger.warn(`[${this._id}] <-x- ${payload.length} bytes (-header,decrypted) <-- ${buffer.length} bytes`);
      } else {
        Logger.info(`[${this._id}] <-- ${payload.length} bytes (-header,hash=${hash(payload)}) <-- ${buffer.length} bytes(encrypted,hash=${hash(buffer)})`);
        this._lsocket.write(payload);
      }
    }
  }

  /**
   * send data forward via this._socket.write()
   * @param buffer
   */
  send(buffer) {
    if (Config.isServer) {
      this.sendFromServer(buffer);
    } else {
      this.sendFromClient(buffer);
    }
  }

  sendFromServer(buffer) {
    const decrypted = Crypto.decrypt(buffer);
    const frame = Encapsulator.unpack(decrypted);
    if (frame === null) {
      Logger.warn(`[${this._id}] -x-> dropped unidentified packet ${buffer.length} bytes`);
      return;
    }

    const payload = frame.PAYLOAD;
    const _send = (data) => {
      if (!this._socket.destroyed) {
        Logger.info(`[${this._id}] --> ${buffer.length} bytes(encrypted,hash=${hash(buffer)}) --> ${data.length} bytes (-header,hash=${hash(data)})`);
        this._socket.write(data);
      } else {
        Logger.warn(`[${this._id}] -x-> ${buffer.length} bytes -x-> ${data.length} bytes (-header,decrypted)`);
        this._lsocket.end();
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

  sendFromClient(buffer) {
    const encrypted = Crypto.encrypt(Encapsulator.pack(this._connection, buffer).toBuffer());
    const _send = (data) => {
      Logger.info(`[${this._id}] --> ${buffer.length} bytes(origin,hash=${hash(buffer)}) --> ${data.length} bytes (+header,encrypted,hash=${hash(data)})`);
      this._socket.write(data);
    };

    // connect to our server if not connected yet
    if (!this._isConnected) {
      this._connect(Config.server_host, Config.server_port, () => {
        _send(encrypted);
      });
      return;
    }
    _send(encrypted);
  }

  close() {
    if (this._socket !== null && !this._socket.destroyed) {
      this._socket.end();
    }
  }

}
