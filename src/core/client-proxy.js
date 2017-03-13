import {Utils} from '../utils';

import {
  IdentifierMessage,
  SelectMessage,
  RequestMessage as Socks5RequestMessage,
  ReplyMessage as Socks5ReplyMessage,
  // UdpRequestMessage
} from '../proxies/socks5';

import {
  RequestMessage as Socks4RequestMessage,
  ReplyMessage as Socks4ReplyMessage
} from '../proxies/socks4';

import {
  HttpRequestMessage,
  ConnectReplyMessage
} from '../proxies/http';

import {
  ATYP_V4,
  ATYP_DOMAIN,
  REQUEST_COMMAND_CONNECT,
  REQUEST_COMMAND_UDP,
  REPLY_GRANTED,
  REPLY_SUCCEEDED,
  REPLY_COMMAND_NOT_SUPPORTED
} from '../proxies/common';

export class ClientProxy {

  _socksTcpReady = false;

  _socksUdpReady = false;

  _httpReady = false;

  constructor(props) {
    this.onHandshakeDone = props.onHandshakeDone;
  }

  isDone() {
    return [this._socksTcpReady, this._socksUdpReady, this._httpReady].some((v) => !!v);
  }

  makeHandshake(socket, buffer) {
    this._trySocksHandshake(socket, buffer);
    if (!this.isDone()) {
      this._tryHttpHandshake(socket, buffer);
    }
  }

  _trySocksHandshake(socket, buffer) {
    if (!this.isDone()) {
      this._trySocks5Handshake(socket, buffer);
    }
    if (!this.isDone()) {
      this._trySocks4Handshake(socket, buffer);
    }
  }

  _trySocks4Handshake(socket, buffer) {
    const request = Socks4RequestMessage.parse(buffer);
    if (request !== null) {
      const {CMD, DSTIP, DSTADDR, DSTPORT} = request;
      if (CMD === REQUEST_COMMAND_CONNECT) {
        const addr = {
          type: DSTADDR.length > 0 ? ATYP_DOMAIN : ATYP_V4,
          host: DSTADDR.length > 0 ? DSTADDR : DSTIP,
          port: DSTPORT
        };
        this.onHandshakeDone(addr, () => {
          // reply success
          const message = new Socks4ReplyMessage({CMD: REPLY_GRANTED});
          socket.write(message.toBuffer());
          this._socksTcpReady = true;
        });
      }
    }
  }

  _trySocks5Handshake(socket, buffer) {
    // 1. IDENTIFY
    const identifier = IdentifierMessage.parse(buffer);
    if (identifier !== null) {
      const message = new SelectMessage();
      socket.write(message.toBuffer());
      return;
    }

    // 2. REQUEST
    const request = Socks5RequestMessage.parse(buffer);
    if (request !== null) {
      const type = request.CMD;
      switch (type) {
        case REQUEST_COMMAND_UDP: // UDP ASSOCIATE
        case REQUEST_COMMAND_CONNECT: {
          const addr = {
            type: request.ATYP,
            host: request.DSTADDR,
            port: request.DSTPORT
          };
          this.onHandshakeDone(addr, () => {
            // reply success
            const message = new Socks5ReplyMessage({REP: REPLY_SUCCEEDED});
            socket.write(message.toBuffer());

            if (type === REQUEST_COMMAND_CONNECT) {
              this._socksTcpReady = true;
            } else {
              this._socksUdpReady = true;
            }
          });
          break;
        }
        default: {
          const message = new Socks5ReplyMessage({REP: REPLY_COMMAND_NOT_SUPPORTED});
          socket.write(message.toBuffer());
          break;
        }
      }
    }
  }

  _tryHttpHandshake(socket, buffer) {
    const request = HttpRequestMessage.parse(buffer);
    if (request !== null) {
      const {METHOD, HOST} = request;
      const addr = Utils.parseURI(HOST.toString());

      this.onHandshakeDone(addr, () => {
        if (METHOD.toString() === 'CONNECT') {
          const message = new ConnectReplyMessage();
          socket.write(message.toBuffer());
        } else {
          // for clients who haven't sent CONNECT, should begin to relay immediately
          this.onForward(buffer);
        }
        this._httpReady = true;
      });
    }
  }

}
