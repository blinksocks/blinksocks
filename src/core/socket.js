import net from 'net';
import logger from 'winston';
import {DNSCache} from './dns-cache';
import {Pipe} from './pipe';
import {
  MIDDLEWARE_DIRECTION_UPWARD,
  MIDDLEWARE_DIRECTION_DOWNWARD,
  MIDDLEWARE_TYPE_FRAME,
  MIDDLEWARE_TYPE_CRYPTO,
  MIDDLEWARE_TYPE_PROTOCOL,
  MIDDLEWARE_TYPE_OBFS,
  createMiddleware
} from './middleware';

import {Utils} from '../utils';
import {
  SOCKET_CONNECT_TO_DST,
  PROCESSING_FAILED
} from '../presets/actions';

import {
  IdentifierMessage,
  SelectMessage,
  RequestMessage as Socks5RequestMessage,
  ReplyMessage as Socks5ReplyMessage,
  UdpRequestMessage
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

const dnsCache = DNSCache.create();

export class Socket {

  _id = null;

  _bsocket = null;

  _fsocket = null;

  _socksTcpReady = false;

  _socksUdpReady = false;

  _httpReady = false;

  _pipe = null;

  constructor({id, socket}) {
    this._id = id;
    this._bsocket = socket;
    this._bsocket.on('error', (err) => this.onError(err));
    this._bsocket.on('close', (had_error) => this.onClose(had_error));
    this._bsocket.on('data', (buffer) => this.onForward(buffer));
    this.onError = this.onError.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onForward = this.onForward.bind(this);
    this.onBackward = this.onBackward.bind(this);
    if (__IS_SERVER__) {
      this.createPipe();
    }
  }

  isHandshakeDone() {
    return [this._socksTcpReady, this._socksUdpReady, this._httpReady].some((v) => !!v);
  }

  onForward(buffer) {
    if (__IS_CLIENT__ && !this.isHandshakeDone()) {
      // client handshake(multiple-protocols), client only
      this.onHandshake(buffer);
      return;
    }

    let _buffer = buffer;

    // udp compatible
    if (__IS_CLIENT__ && this._socksUdpReady) {
      const request = UdpRequestMessage.parse(buffer);
      if (request !== null) {
        // just drop RSV and FRAG
        _buffer = request.DATA;
      } else {
        logger.warn(`[${this._id}] -x-> dropped unidentified packet ${buffer.length} bytes`);
        return;
      }
    }

    try {
      this._pipe.feed(
        __IS_CLIENT__
          ? MIDDLEWARE_DIRECTION_UPWARD
          : MIDDLEWARE_DIRECTION_DOWNWARD,
        _buffer
      );
    } catch (err) {
      logger.error(`[${this._id}]`, err);
    }
  }

  onBackward(buffer) {
    try {
      this._pipe.feed(
        __IS_CLIENT__
          ? MIDDLEWARE_DIRECTION_DOWNWARD
          : MIDDLEWARE_DIRECTION_UPWARD,
        buffer
      );
    } catch (err) {
      logger.error(`[${this._id}]`, err);
    }
  }

  onError(err) {
    switch (err.code) {
      case 'ECONNREFUSED':
      case 'EADDRNOTAVAIL':
      case 'ENETDOWN':
      case 'ECONNRESET':
      case 'ETIMEDOUT':
      case 'EAI_AGAIN':
      case 'EPIPE':
        logger.warn(`[${this._id}] ${err.message}`);
        return;
      default:
        logger.error(err);
        break;
    }
  }

  onClose() {
    if (this._bsocket !== null && !this._bsocket.destroyed) {
      this._bsocket.end();
      this._bsocket = null;
      logger.warn(`[${this._id}] downstream closed`);
    }
    if (this._fsocket !== null && !this._fsocket.destroyed) {
      this._fsocket.end();
      this._fsocket = null;
      logger.warn(`[${this._id}] upstream closed`);
    }
  }

  send(buffer, flag) {
    if (flag) {
      this._fsocket && this._fsocket.write(buffer);
    } else {
      this._bsocket && this._bsocket.write(buffer);
    }
  }

  /**
   * create pipes for both data forward and backward
   */
  createPipe(addr) {
    const pipeProps = {
      onNotified: (action) => {
        if (__IS_SERVER__ && action.type === SOCKET_CONNECT_TO_DST) {
          return this.connectToDst(...action.payload);
        }
        if (action.type === PROCESSING_FAILED) {
          const message = action.payload;
          const timeout = Utils.getRandomInt(10, 40);
          logger.error(`connection will be closed in ${timeout}s due to: ${message}`);
          setTimeout(() => this.onClose(), timeout * 1e3);
        }
      }
    };
    this._pipe = new Pipe(pipeProps);
    this._pipe.setMiddlewares(MIDDLEWARE_DIRECTION_UPWARD, [
      createMiddleware(MIDDLEWARE_TYPE_FRAME, [addr]),
      createMiddleware(MIDDLEWARE_TYPE_CRYPTO),
      createMiddleware(MIDDLEWARE_TYPE_PROTOCOL),
      createMiddleware(MIDDLEWARE_TYPE_OBFS),
    ]);
    this._pipe.on(`next_${MIDDLEWARE_DIRECTION_UPWARD}`, (buf) => this.send(buf, __IS_CLIENT__));
    this._pipe.on(`next_${MIDDLEWARE_DIRECTION_DOWNWARD}`, (buf) => this.send(buf, __IS_SERVER__));
  }

  /**
   * connect to blinksocks server
   * @returns {Promise}
   */
  async connectToServer(addr, callback) {
    const ep = {
      host: __SERVER_HOST__, // TODO: use dnsCache
      port: __SERVER_PORT__
    };
    logger.info(`[${this._id}] connecting to:`, ep);
    this._fsocket = net.connect(ep, () => {
      this.createPipe(addr);
      callback();
    });
    this._fsocket.on('error', this.onError);
    this._fsocket.on('close', this.onClose);
    this._fsocket.on('data', this.onBackward);
  }

  /**
   * connect to the real server, server side only
   * @param addr
   * @param callback
   * @returns {Promise.<void>}
   */
  async connectToDst(addr, callback) {
    const {host, port} = addr;
    try {
      const ip = await dnsCache.get(host);
      logger.info(`[${this._id}] connecting to ${host}(${ip}:${port})`);
      this._fsocket = net.connect({host: ip, port}, callback);
      this._fsocket.on('error', this.onError);
      this._fsocket.on('close', this.onClose);
      this._fsocket.on('data', this.onBackward);
    } catch (err) {
      logger.error(err.message);
    }
  }

  /*** client handshake, multiple protocols ***/

  onHandshake(buffer) {
    this.trySocksHandshake(this._bsocket, buffer);
    if (!this.isHandshakeDone()) {
      this.tryHttpHandshake(this._bsocket, buffer);
    }
  }

  onHandshakeDone(addr, callback) {
    return this.connectToServer(addr, callback);
  }

  trySocksHandshake(socket, buffer) {
    if (!this.isHandshakeDone()) {
      this.trySocks5Handshake(socket, buffer);
    }
    if (!this.isHandshakeDone()) {
      this.trySocks4Handshake(socket, buffer);
    }
  }

  trySocks4Handshake(socket, buffer) {
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

  trySocks5Handshake(socket, buffer) {
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

  tryHttpHandshake(socket, buffer) {
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
