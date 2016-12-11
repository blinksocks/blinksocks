import log4js from 'log4js';
import {Connection} from '../Connection';
import {Relay} from '../Relay';
import {Crypto} from '../Crypto';
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

  _relay = null;

  _socksReady = false;

  _connection = null;

  _decipher = null;

  _cipher = null;

  constructor({id, socket}) {
    Logger.setLevel(Config.log_level);
    this._id = id;
    this._socket = socket;
    this._relay = new Relay({
      id: this._id,
      socket: socket
    });
    // events
    socket.on('error', (err) => this.onError(socket, err));
    socket.on('close', (had_error) => this.onClose(socket, had_error));
    socket.on('data', (buffer) => this.onReceiving(socket, buffer));
    this._decipher = Crypto.createDecipher((buffer) => this.onReceived(buffer));
    this._cipher = Crypto.createCipher((buffer) => this.onReceived(buffer));

    Logger.info(`client[${this._id}] connected`);
  }

  onReceiving(socket, buffer) {
    if (!this._socksReady && !Config.isServer) {
      // only client side should do socks5 handshake
      this.onSocksHandshake(socket, buffer);
      return;
    }
    if (Config.isServer) {
      this._decipher.write(buffer);
    } else {
      this._cipher.write(Encapsulator.pack(this._connection, buffer).toBuffer());
    }
  }

  onReceived(buffer) {
    if (Config.isServer) {
      this._relay.forwardToDst(buffer);
    } else {
      this._relay.forwardToServer(buffer);
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
    this._relay.close();
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
