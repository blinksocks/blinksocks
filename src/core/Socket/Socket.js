import net from 'net';
import {Address} from '../Address';
import {DNSCache} from '../DNSCache';
import {Pipe} from '../Pipe';
import {
  MIDDLEWARE_DIRECTION_UPWARD,
  MIDDLEWARE_DIRECTION_DOWNWARD,
  FrameMiddleware,
  CryptoMiddleware,
  ProtocolMiddleware,
  ObfsMiddleware
} from '../Middlewares';

import {Utils} from '../../utils';
import {
  SOCKET_CONNECT_TO_DST,
  CRYPTO_SET_IV,
  CRYPTO_SET_IV_AFTER
} from '../../constants';

import {
  IdentifierMessage,
  SelectMessage,
  RequestMessage as Socks5RequestMessage,
  ReplyMessage as Socks5ReplyMessage,
  UdpRequestMessage
  // UdpRequestMessage
} from '../../proxies/socks5';

import {
  RequestMessage as Socks4RequestMessage,
  ReplyMessage as Socks4ReplyMessage
} from '../../proxies/socks4';

import {
  HttpRequestMessage,
  ConnectReplyMessage
} from '../../proxies/http';

import {
  ATYP_V4,
  ATYP_DOMAIN,
  REQUEST_COMMAND_CONNECT,
  REQUEST_COMMAND_UDP,
  REPLY_GRANTED,
  REPLY_SUCCEEDED,
  REPLY_COMMAND_NOT_SUPPORTED
} from '../../proxies/common';

const Logger = require('../../utils/logger')(__filename);
const dnsCache = DNSCache.create();

export class Socket {

  _id = null;

  _bsocket = null;

  _fsocket = null;

  _socksTcpReady = false;

  _socksUdpReady = false;

  _httpReady = false;

  _targetAddress = null;

  _pipeForward = null;

  _pipeBackward = null;

  constructor({id, socket}) {
    Logger.setLevel(__LOG_LEVEL__);
    this._id = id;
    this._bsocket = socket;
    // handle events
    this._bsocket.on('error', (err) => this.onError(err));
    this._bsocket.on('close', (had_error) => this.onClose(had_error));
    this._bsocket.on('data', (buffer) => this.onForward(buffer));
    if (__IS_SERVER__) {
      this.createPipes();
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
        if (Logger.isWarnEnabled()) {
          Logger.warn(`[${this._id}] -x-> dropped unidentified packet ${buffer.length} bytes`);
        }
        return;
      }
    }

    this._pipeForward.feed(_buffer)
      .then((buf) => this._fsocket.write(buf))
      .catch((err) => Logger.error(err.message));
  }

  onBackward(buffer) {
    this._pipeBackward.feed(buffer)
      .then((buf) => this._bsocket.write(buf))
      .catch((err) => Logger.error(err));
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
        Logger.warn(`[${this._id}] ${err.message}`);
        return;
      default:
        Logger.error(err);
        break;
    }
    this.onClose(true);
  }

  onClose(had_error) {
    if (had_error) {
      Logger.warn(`client[${this._id}] closed due to a transmission error`);
    } else {
      Logger.info(`client[${this._id}] closed normally`);
    }
    if (this._bsocket !== null && !this._bsocket.destroyed) {
      this._bsocket.end();
      this._bsocket = null;
    }
    if (this._fsocket !== null && !this._fsocket.destroyed) {
      this._fsocket.end();
      this._fsocket = null;
    }
  }

  /**
   * TODO(refactor): too redundant
   * create pipes for both data forward and backward
   */
  createPipes() {
    if (__IS_CLIENT__) {
      // forward
      const props_1 = {direction: MIDDLEWARE_DIRECTION_UPWARD};
      const props_2 = {direction: MIDDLEWARE_DIRECTION_DOWNWARD};
      const fcrypto = new CryptoMiddleware(props_1);
      const bcrypto = new CryptoMiddleware(props_2);
      this._pipeForward = new Pipe({
        onNotify: (action) => {
          switch (action.type) {
            case CRYPTO_SET_IV_AFTER: {
              const iv = action.payload;
              fcrypto.deferUpdateCiphers(iv);
              bcrypto.updateCiphers(iv);
              break;
            }
            default:
              return false;
          }
          return true;
        }
      });

      this._pipeForward
        .pipe(new FrameMiddleware({...props_1, address: this._targetAddress}))
        .pipe(new ProtocolMiddleware(props_1))
        .pipe(fcrypto)
        .pipe(new ObfsMiddleware(props_1));

      // backward
      this._pipeBackward = new Pipe();
      this._pipeBackward
        .pipe(new ObfsMiddleware(props_2))
        .pipe(bcrypto)
        .pipe(new ProtocolMiddleware(props_2))
        .pipe(new FrameMiddleware(props_2));
    }

    if (__IS_SERVER__) {
      // forward
      const props_1 = {direction: MIDDLEWARE_DIRECTION_DOWNWARD};
      const props_2 = {direction: MIDDLEWARE_DIRECTION_UPWARD};
      const fcrypto = new CryptoMiddleware(props_1);
      const bcrypto = new CryptoMiddleware(props_2);

      this._pipeForward = new Pipe({
        onNotify: (action) => {
          switch (action.type) {
            case CRYPTO_SET_IV: {
              const iv = action.payload;
              fcrypto.updateCiphers(iv);
              bcrypto.updateCiphers(iv);
              break;
            }
            case SOCKET_CONNECT_TO_DST:
              this.connectToDst(...action.payload);
              break;
            default:
              return false;
          }
          return true;
        }
      });
      this._pipeForward
        .pipe(new ObfsMiddleware(props_1))
        .pipe(fcrypto)
        .pipe(new ProtocolMiddleware(props_1))
        .pipe(new FrameMiddleware(props_1));

      // backward
      this._pipeBackward = new Pipe();
      this._pipeBackward
        .pipe(new FrameMiddleware(props_2))
        .pipe(new ProtocolMiddleware(props_2))
        .pipe(bcrypto)
        .pipe(new ObfsMiddleware(props_2));
    }
  }

  /**
   * connect to blinksocks server
   * @returns {Promise}
   */
  connectToServer() {
    return new Promise((resolve, reject) => {
      this._fsocket = net.connect({
        host: __SERVER_HOST__,
        port: __SERVER_PORT__
      });
      this._fsocket.on('connect', () => {
        this.createPipes();
        resolve();
      });
      this._fsocket.on('error', (err) => reject(err));
      this._fsocket.on('close', (had_error) => this.onClose(had_error));
      this._fsocket.on('data', (buffer) => this.onBackward(buffer));
    });
  }

  /**
   * connect to the real server, server side only
   * @param address
   * @param callback
   * @returns {Promise.<void>}
   */
  async connectToDst(address, callback) {
    const [host, port] = address.getEndPoint();
    const ip = await dnsCache.get(host);
    this._fsocket = net.connect({host: ip, port}, callback);
    this._fsocket.on('error', (err) => this.onError(err));
    this._fsocket.on('close', (had_error) => this.onClose(had_error));
    this._fsocket.on('data', (buffer) => this.onBackward(buffer));
  }

  /*** client handshake, multiple protocols ***/

  onHandshake(buffer) {
    this.trySocksHandshake(this._bsocket, buffer);
    if (!this.isHandshakeDone()) {
      this.tryHttpHandshake(this._bsocket, buffer);
    }
  }

  onHandshakeDone(callback) {
    this.connectToServer().then(callback).catch(this.onError.bind(this));
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
        this._targetAddress = new Address({
          ATYP: DSTADDR.length > 0 ? ATYP_DOMAIN : ATYP_V4,
          DSTADDR: DSTADDR.length > 0 ? DSTADDR : DSTIP,
          DSTPORT
        });
        this.onHandshakeDone(() => {
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
          this._targetAddress = new Address({
            ATYP: request.ATYP,
            DSTADDR: request.DSTADDR,
            DSTPORT: request.DSTPORT
          });
          this.onHandshakeDone(() => {
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

      this._targetAddress = Utils.hostToAddress(HOST.toString());
      this._httpReady = true;

      if (METHOD.toString() === 'CONNECT') {
        this.onHandshakeDone(() => {
          const message = new ConnectReplyMessage();
          socket.write(message.toBuffer());
        });
      } else {
        // for clients who haven't sent CONNECT, should begin to relay immediately
        this.onReceiving(socket, buffer);
      }
    }
  }

}
