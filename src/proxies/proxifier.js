import net from 'net';
import ip from 'ip';
import {parseURI} from '../utils';

import {
  IdentifierMessage,
  SelectMessage,
  RequestMessage as Socks5RequestMessage,
  ReplyMessage as Socks5ReplyMessage,
  // UdpRequestMessage
} from './socks5';

import {
  RequestMessage as Socks4RequestMessage,
  ReplyMessage as Socks4ReplyMessage
} from './socks4';

import {
  HttpRequestMessage,
  ConnectReplyMessage
} from './http';

import {
  ATYP_V4,
  ATYP_V6,
  ATYP_DOMAIN,
  REQUEST_COMMAND_CONNECT,
  REQUEST_COMMAND_UDP,
  REPLY_GRANTED,
  REPLY_SUCCEEDED,
  REPLY_COMMAND_NOT_SUPPORTED
} from './common';

export class Proxifier {

  _socksTcpReady = false;

  _socksUdpReady = false;

  _httpReady = false;

  constructor(props) {
    this.onHandshakeDone = props.onHandshakeDone;
  }

  isDone() {
    return this._socksTcpReady || this._socksUdpReady || this._httpReady;
  }

  makeHandshake(feedback, buffer) {
    this._trySocksHandshake(feedback, buffer);
    if (!this.isDone()) {
      this._tryHttpHandshake(feedback, buffer);
    }
  }

  _trySocksHandshake(feedback, buffer) {
    if (!this.isDone()) {
      this._trySocks5Handshake(feedback, buffer);
    }
    if (!this.isDone()) {
      this._trySocks4Handshake(feedback, buffer);
    }
  }

  _trySocks4Handshake(feedback, buffer) {
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
          feedback(message.toBuffer());
          this._socksTcpReady = true;
        });
      }
    }
  }

  _trySocks5Handshake(feedback, buffer) {
    // 1. IDENTIFY
    const identifier = IdentifierMessage.parse(buffer);
    if (identifier !== null) {
      const message = new SelectMessage();
      feedback(message.toBuffer());
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
            feedback(message.toBuffer());

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
          feedback(message.toBuffer());
          break;
        }
      }
    }
  }

  _tryHttpHandshake(feedback, buffer) {
    const request = HttpRequestMessage.parse(buffer);
    if (request !== null) {
      const {METHOD, URI, HOST} = request;
      const method = METHOD.toString();
      let addr = {};
      if (method === 'CONNECT') {
        addr = parseURI(URI.toString());
      } else {
        let type = null;
        let host = HOST.toString();
        if (net.isIP(host)) {
          if (net.isIPv4(host)) {
            type = ATYP_V4;
          } else {
            type = ATYP_V6;
          }
          host = ip.toBuffer(host);
        } else {
          type = ATYP_DOMAIN;
          host = HOST;
        }
        addr = {type, host, port: Buffer.from([0x00, 0x50])};
      }
      this.onHandshakeDone(addr, (onForward) => {
        if (method === 'CONNECT') {
          const message = new ConnectReplyMessage();
          feedback(message.toBuffer());
        } else {
          // for clients who haven't sent CONNECT, should begin to relay immediately
          onForward(buffer);
        }
        this._httpReady = true;
      });
    }
  }

}
