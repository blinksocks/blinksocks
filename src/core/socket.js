import net from 'net';
import logger from 'winston';
import {ClientProxy} from './client-proxy';
import {DNSCache} from './dns-cache';
import {Balancer} from './balancer';
import {Pipe} from './pipe';
import {Profile} from './profile';
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
  UdpRequestMessage
} from '../proxies/socks5';

const dnsCache = DNSCache.create();

export class Socket {

  _id = null;

  _bsocket = null;

  _fsocket = null;

  _pipe = null;

  _proxy = null; // client only

  _lastEndPoint = null;

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
    } else {
      this._proxy = new ClientProxy({
        onHandshakeDone: this.onHandshakeDone.bind(this)
      });
    }
  }

  onForward(buffer) {
    if (__IS_CLIENT__ && !this._proxy.isDone()) {
      // client handshake(multiple-protocols), client only
      this._proxy.makeHandshake(this._bsocket, buffer);
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
      Profile.totalIn += buffer.length;
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
      Profile.totalIn += buffer.length;
    } catch (err) {
      logger.error(`[${this._id}]`, err);
    }
  }

  onError(err) {
    switch (err.code) {
      case 'EADDRNOTAVAIL':
      case 'ENETUNREACH':
      case 'ECONNREFUSED':
      case 'ETIMEDOUT':
      case 'ENETDOWN':
      case 'ECONNRESET':
      case 'EAI_AGAIN':
      case 'EPIPE':
        logger.verbose(`[${this._id}] ${err.code} - ${err.message}`);
        break;
      default:
        logger.error(err);
        break;
    }
    Profile.errors += 1;
  }

  onClose() {
    if (this._bsocket !== null && !this._bsocket.destroyed) {
      this._bsocket.end();
      this._bsocket = null;
      logger.info(`[${this._id}] downstream closed`);
      Profile.connections -= 1;
    }
    if (this._fsocket !== null && !this._fsocket.destroyed) {
      this._fsocket.end();
      this._fsocket = null;
      logger.info(`[${this._id}] upstream closed`);
      Profile.connections -= 1;
    }
  }

  send(buffer, flag) {
    if (flag) {
      this._fsocket && !this._fsocket.destroyed && this._fsocket.write(buffer);
    } else {
      this._bsocket && !this._bsocket.destroyed && this._bsocket.write(buffer);
    }
    Profile.totalOut += buffer.length;
  }

  /**
   * connect to a server, for both client and server
   * @param host
   * @param port
   * @param callback
   * @returns {Promise.<void>}
   */
  async connectTo({host, port}, callback) {
    logger.info(`[${this._id}] connecting to: ${host}:${port}`);
    try {
      const ip = await dnsCache.get(host);
      this._fsocket = net.connect({host: ip, port}, callback);
      this._fsocket.on('error', this.onError);
      this._fsocket.on('close', this.onClose);
      this._fsocket.on('data', this.onBackward);
    } catch (err) {
      logger.error(err.message);
    }
  }

  /**
   * create pipes for both data forward and backward
   */
  createPipe(addr) {
    const pipeProps = {
      onNotified: (action) => {
        if (__IS_SERVER__ && action.type === SOCKET_CONNECT_TO_DST) {
          const [addr, callback] = action.payload;
          return this.connectTo(addr, callback);
        }
        if (action.type === PROCESSING_FAILED) {
          const message = action.payload;
          const timeout = Utils.getRandomInt(10, 40);
          logger.error(`connection will be closed in ${timeout}s due to: ${message}`);
          Profile.fatals += 1;
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
   * client handshake
   * @param addr
   * @param callback
   * @returns {Promise.<void>}
   */
  onHandshakeDone(addr, callback) {
    const ep = Balancer.getFastest();
    if (this._lastEndPoint === null || ep.host !== this._lastEndPoint.host || ep.port !== this._lastEndPoint.port) {
      logger.info('[balancer] use:', JSON.stringify(ep));
    }
    this._lastEndPoint = ep;
    return this.connectTo(ep, () => {
      this.createPipe(addr);
      callback(this.onForward);
    });
  }

}
