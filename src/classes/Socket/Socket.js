import log4js from 'log4js';
import {AdvancedBuffer} from '../AdvancedBuffer';
import {Connection} from '../Connection';
import {Relay} from '../Relay';
import {Crypto} from '../Crypto';
import {Config} from '../Config';

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

  _buffer = new AdvancedBuffer({
    getPacketLength: function (bytes) {
      return Crypto.decrypt(bytes).readUIntBE(0, bytes.length);
    }
  });

  constructor({id, socket}) {
    Logger.setLevel(Config.log_level);
    this._id = id;
    this._socket = socket;
    // TODO: create Relay when Socks5 handshake was done
    this._relay = new Relay({
      id: this._id,
      socket: socket
    });
    // events
    this._buffer.on('data', (buffer) => this.onReceived(buffer));
    socket.on('data', (buffer) => this.onReceiving(socket, buffer));
    socket.on('error', (err) => this.onError(socket, err));
    socket.on('close', (had_error) => this.onClose(socket, had_error));

    Logger.info(`client[${this._id}] connected`);
  }

  onReceiving(socket, buffer) {
    if (!this._socksReady && !Config.isServer) {
      // only client side should do socks5 handle shake
      this.socksHandShake(socket, buffer);
      return;
    }
    if (Config.isServer) {
      // NOTE: We should take advantages of AdvancedBuffer to get a complete packet.
      //       DO NOT decrypt the buffer(chunk) at once it was received, or AES will fail.
      this._buffer.put(buffer);
    } else {
      this.onReceived(buffer);
    }
  }

  onReceived(buffer) {
    this._relay.send(buffer);
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

  socksHandShake(socket, buffer) {
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
      const connection = new Connection({
        ATYP: request.ATYP,
        DSTADDR: request.DSTADDR,
        DSTPORT: request.DSTPORT
      });
      this._relay.setConnection(connection);

      // ACK
      const message = new ReplyMessage({REP: REPLY_SUCCEEDED});
      socket.write(message.toBuffer());

      this._socksReady = true; // done.
    }
  }

}
