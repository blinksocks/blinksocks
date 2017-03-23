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

const TRACK_CHAR_UPLOAD = 'u';
const TRACK_CHAR_DOWNLOAD = 'd';
const TRACK_MAX_SIZE = 40;

let lastTarget = null;

export class Socket {

  _id = null;

  _onClose = null;

  _bsocket = null;

  _fsocket = null;

  _pipe = null;

  _proxy = null; // client only

  _tracks = []; // [`remote`, `target`, 'u', '20', 'u', '20', 'd', '10', ...]

  constructor({id, socket, onClose}) {
    this.onError = this.onError.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onForward = this.onForward.bind(this);
    this.onBackward = this.onBackward.bind(this);
    this._id = id;
    this._onClose = onClose;
    this._bsocket = socket;
    this._bsocket.on('error', this.onError);
    this._bsocket.on('close', this.onClose);
    this._bsocket.on('data', this.onForward);
    if (__IS_SERVER__) {
      this.createPipe();
    } else {
      this._proxy = new ClientProxy({
        onHandshakeDone: this.onHandshakeDone.bind(this)
      });
    }
    this._tracks.push(`${socket.remoteAddress}:${socket.remotePort}`);
  }

  get id() {
    return this._id;
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
      this._tracks.push(TRACK_CHAR_DOWNLOAD);
      this._tracks.push(buffer.length);
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
      this._tracks.push(TRACK_CHAR_DOWNLOAD);
      this._tracks.push(buffer.length);
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
    const sockets = [this._bsocket, this._fsocket];
    for (const socket of sockets) {
      if (socket !== null && !socket.destroyed) {
        socket.destroy();
        this._onClose(this); // notify hub to remove this one
        logger.info(`[socket] [${this._id}] closed`);
        this.dumpTrack();
      }
    }
    this._bsocket = null;
    this._fsocket = null;
  }

  send(buffer, flag) {
    if (flag) {
      this._fsocket && !this._fsocket.destroyed && this._fsocket.write(buffer);
    } else {
      this._bsocket && !this._bsocket.destroyed && this._bsocket.write(buffer);
    }
    Profile.totalOut += buffer.length;
    this._tracks.push(TRACK_CHAR_UPLOAD);
    this._tracks.push(buffer.length);
  }

  /**
   * connect to a server, for both client and server
   * @param host
   * @param port
   * @param callback
   * @returns {Promise.<void>}
   */
  async connect({host, port}, callback) {
    logger.info(`[socket] [${this._id}] connecting to: ${host}:${port}`);
    this._tracks.push(`${host}:${port}`);
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
          return this.connect(addr, callback);
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
   * print connection track string, and only record the
   * leading and the trailing TRACK_MAX_SIZE / 2
   */
  dumpTrack() {
    const strs = [];
    const perSize = Math.floor(TRACK_MAX_SIZE / 2);
    const tracks = (this._tracks.length > TRACK_MAX_SIZE) ?
      this._tracks.slice(0, perSize).concat([' ... ']).concat(this._tracks.slice(-perSize)) :
      this._tracks;
    let ud = '';
    for (const el of tracks) {
      if (el === TRACK_CHAR_UPLOAD || el === TRACK_CHAR_DOWNLOAD) {
        if (ud === el) {
          continue;
        }
        ud = el;
      }
      strs.push(el);
    }
    logger.info(`[socket] [${this._id}] summary: ${strs.join(' ')}`);
  }

  /**
   * client handshake
   * @param addr
   * @param callback
   * @returns {Promise.<void>}
   */
  onHandshakeDone(addr, callback) {
    const ep = Balancer.getFastest();
    if (lastTarget === null || ep.host !== lastTarget.host || ep.port !== lastTarget.port) {
      logger.info('[balancer] use:', JSON.stringify(ep));
    }
    lastTarget = ep;
    return this.connect(ep, () => {
      this.createPipe(addr);
      callback(this.onForward);
    });
  }

}
