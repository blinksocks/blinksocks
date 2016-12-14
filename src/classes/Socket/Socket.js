import log4js from 'log4js';
import {Relay} from '../Relay';
import {Address} from '../Address';
import {Crypto, CRYPTO_IV_LEN} from '../Crypto';
import {Config} from '../Config';
import {Encapsulator} from '../Encapsulator';

import {
  IdentifierMessage,
  SelectMessage,
  RequestMessage,
  ReplyMessage
} from '../../socks5';

import {
  REQUEST_COMMAND_CONNECT,
  REPLY_SUCCEEDED
  // REPLY_FAILURE
} from '../../socks5/Constants';

const Logger = log4js.getLogger('Socket');

export class Socket {

  _id = null;

  _socket = null;

  _relay = null;

  _socksReady = false;

  _connection = null;

  _decipher = null;

  _cipher = null;

  _iv = null;

  constructor({id, socket}) {
    Logger.setLevel(Config.log_level);
    this._id = id;
    this._socket = socket;
    this.updateCiphers();
    // events
    socket.on('error', (err) => this.onError(socket, err));
    socket.on('close', (had_error) => this.onClose(socket, had_error));
    socket.on('data', (buffer) => this.onReceiving(socket, buffer));
    Logger.info(`client[${this._id}] connected`);
  }

  obtainIV(buffer) {
    if (buffer.length < CRYPTO_IV_LEN + 9) {
      if (Logger.isFatalEnabled()) {
        Logger.fatal(`cannot obtain iv from client, packet is too small (${buffer.length}bytes)`);
      }
      return null;
    }
    return buffer.slice(-CRYPTO_IV_LEN);
  }

  updateCiphers() {
    const collector = (buffer) => this.onReceived(buffer);
    const iv = this.iv === null ? undefined : this._iv;
    this._cipher = Crypto.createCipher(collector, iv);
    this._decipher = Crypto.createDecipher(collector, iv);
  }

  getRelay() {
    if (this._relay === null) {
      this._relay = new Relay({
        id: this._id,
        socket: this._socket
      });
    }
    return this._relay;
  }

  onReceiving(socket, buffer) {
    // socks5 handshake, client only
    if (!this._socksReady && !Config.isServer) {
      this.onSocksHandshake(socket, buffer);
      return;
    }

    if (Config.isServer) {
      this._decipher.write(buffer);
    } else {
      // send with iv if needed
      if (this._iv === null && Config.use_iv) {
        this._iv = Crypto.generateIV();
        this._cipher.write(Encapsulator.pack(this._connection, Buffer.concat([buffer, this._iv])).toBuffer());
        // update relay ciphers
        this.getRelay().setIV(this._iv);
        // update _cipher and _decipher to use iv
        this.updateCiphers();
        return;
      }
      // send normal packet
      this._cipher.write(Encapsulator.pack(this._connection, buffer).toBuffer());
    }
  }

  onReceived(buffer) {
    const relay = this.getRelay();
    if (Config.isServer) {
      // obtain iv from the first packet if needed
      if (this._iv === null && Config.use_iv) {
        this._iv = this.obtainIV(buffer);
        if (this._iv === null) {
          this._socket.end();
          this._socket.destroy();
          return;
        }
        const buf = buffer.slice(0, buffer.length - CRYPTO_IV_LEN);
        const newLen = Encapsulator.numberToArray(buf.readUInt16BE(0) - CRYPTO_IV_LEN);
        buf[0] = newLen[0];
        buf[1] = newLen[1];
        relay.setIV(this._iv);
        relay.forwardToDst(buf);
        // update _cipher and _decipher to use iv
        this.updateCiphers();
        return;
      }
      relay.forwardToDst(buffer);
    } else {
      relay.forwardToServer(buffer);
    }
  }

  onError(socket, err) {
    switch (err.code) {
      case 'ECONNRESET':
        Logger.warn(`client[${this._id}] ${err.message}`);
        return;
      case 'EPIPE':
        Logger.warn(`client[${this._id}] ${err.message}`);
        return;
      default:
        Logger.error(err);
        break;
    }
  }

  onClose(socket, had_error) {
    if (had_error) {
      Logger.warn(`client[${this._id}] closed due to a transmission error`);
    } else {
      Logger.info(`client[${this._id}] closed normally`);
    }
    if (this._relay !== null) {
      this._relay.close();
    }
  }

  onSocksHandshake(socket, buffer) {
    // 1. IDENTIFY
    const identifier = IdentifierMessage.parse(buffer);
    if (identifier !== null) {
      const message = new SelectMessage();
      socket.write(message.toBuffer());
      return;
    }

    // 2. REQUEST
    const request = RequestMessage.parse(buffer);
    if (request && request.CMD === REQUEST_COMMAND_CONNECT) {
      this._connection = new Connection({
        ATYP: request.ATYP,
        DSTADDR: request.DSTADDR,
        DSTPORT: request.DSTPORT
      });

      // ACK
      const message = new ReplyMessage({REP: REPLY_SUCCEEDED});
      socket.write(message.toBuffer());

      this._socksReady = true; // done.
    }
  }

}
