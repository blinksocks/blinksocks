import net from 'net';
import logger from 'winston';
import isEqual from 'lodash.isequal';
import {Config} from './config';
import {ClientProxy} from './client-proxy';
import {DNSCache} from './dns-cache';
import {Balancer} from './balancer';
import {Pipe} from './pipe';
import {Profile} from './profile';
import {
  MIDDLEWARE_DIRECTION_UPWARD,
  MIDDLEWARE_DIRECTION_DOWNWARD,
  createMiddleware
} from './middleware';

import {Utils} from '../utils';
import {
  SOCKET_CONNECT_TO_DST,
  PROCESSING_FAILED
} from '../presets/defs';

import {
  UdpRequestMessage
} from '../proxies/socks5';

const dnsCache = DNSCache.create();

const TRACK_CHAR_UPLOAD = 'u';
const TRACK_CHAR_DOWNLOAD = 'd';
const TRACK_MAX_SIZE = 40;

let lastServer = null;

export class Socket {

  _id = null;

  _onClose = null;

  _isHandshakeDone = false;

  _remoteAddress = '';

  _remotePort = '';

  _bsocket = null;

  _fsocket = null;

  _pipe = null;

  _isRedirect = false; // server only

  _proxy = null; // client only

  // +---+-----------------------+---+
  // | C | d <--> u     u <--> d | S |
  // +---+-----------------------+---+
  _tracks = []; // [`target`, 'u', '20', 'u', '20', 'd', '10', ...]

  _timeout = 0;

  _timeout_timer = null;

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
    this._remoteAddress = socket.remoteAddress;
    this._remotePort = socket.remotePort;
    if (__IS_SERVER__) {
      this.createPipe();
    } else {
      this._proxy = new ClientProxy({
        onHandshakeDone: this.onHandshakeDone.bind(this)
      });
    }
    this.setupTimeout();
  }

  // getters

  get id() {
    return this._id;
  }

  get remote() {
    return `${this._remoteAddress}:${this._remotePort}`;
  }

  get isPipable() {
    return (
      !this._isRedirect &&
      this._bsocket !== null && !this._bsocket.destroyed &&
      this._fsocket !== null && !this._fsocket.destroyed
    );
  }

  // events

  onForward(buffer) {
    // reset timeout
    this._timeout = __TIMEOUT__;

    if (__IS_CLIENT__) {
      if (!this._proxy.isDone()) {
        // client handshake(multiple-protocols)
        this._proxy.makeHandshake(this._bsocket, buffer);
        return;
      }
      this.clientOut(buffer);
    } else {
      if (this._isRedirect) {
        // server redirect
        this._fsocket.write(buffer);
        return;
      }
      this.serverIn(buffer);
    }
    Profile.totalIn += buffer.length;
  }

  onBackward(buffer) {
    // reset timeout
    this._timeout = __TIMEOUT__;

    if (__IS_CLIENT__) {
      this.clientIn(buffer);
    } else {
      if (this._isRedirect) {
        // server redirect
        this._bsocket.write(buffer);
        return;
      }
      this.serverOut(buffer);
    }
  }

  onError(err) {
    logger.warn(`[socket] [${this.remote}] ${err.code} - ${err.message}`);
    Profile.errors += 1;
  }

  onClose() {
    const sockets = [this._bsocket, this._fsocket];
    for (const socket of sockets) {
      if (socket !== null && !socket.destroyed) {
        socket.destroy();
        this._onClose(this); // notify hub to remove this one
        this.dumpTrack();
      }
    }
    this._bsocket = null;
    this._fsocket = null;
    clearInterval(this._timeout_timer);
  }

  /**
   * client handshake
   * @param addr
   * @param callback
   * @returns {Promise.<void>}
   */
  onHandshakeDone(addr, callback) {
    const server = Balancer.getFastest();
    const {host, port} = server;
    if (lastServer === null || !isEqual(server, lastServer)) {
      logger.info(`[balancer] use: ${host}:${port}`);
      Config.initServer(server);
    }
    lastServer = server;
    return this.connect({host, port}, () => {
      this.createPipe(addr);
      this._isHandshakeDone = true;
      callback(this.onForward);
    });
  }

  // pipe chain

  clientOut(buffer) {
    let _buffer = buffer;

    // udp compatible
    if (this._socksUdpReady) {
      const request = UdpRequestMessage.parse(buffer);
      if (request !== null) {
        _buffer = request.DATA; // just drop RSV and FRAG
      } else {
        logger.warn(`[socket] [${this.remote}] -x-> dropped unidentified packet ${buffer.length} bytes`);
        return;
      }
    }

    if (this.isPipable) {
      try {
        this._pipe.feed(MIDDLEWARE_DIRECTION_UPWARD, _buffer);
      } catch (err) {
        logger.error(`[socket] [${this.remote}]`, err);
      }
    }
  }

  serverIn(buffer) {
    if (this.isPipable || !this._isHandshakeDone) {
      try {
        this._pipe.feed(MIDDLEWARE_DIRECTION_DOWNWARD, buffer);
        this._tracks.push(TRACK_CHAR_DOWNLOAD);
        this._tracks.push(buffer.length);
      } catch (err) {
        logger.error(`[socket] [${this.remote}]`, err);
      }
    }
  }

  serverOut(buffer) {
    if (this.isPipable) {
      try {
        this._pipe.feed(MIDDLEWARE_DIRECTION_UPWARD, buffer);
      } catch (err) {
        logger.error(`[socket] [${this.remote}]`, err);
      }
    }
  }

  clientIn(buffer) {
    if (this.isPipable) {
      try {
        this._pipe.feed(MIDDLEWARE_DIRECTION_DOWNWARD, buffer);
        this._tracks.push(TRACK_CHAR_DOWNLOAD);
        this._tracks.push(buffer.length);
      } catch (err) {
        logger.error(`[socket] [${this.remote}]`, err);
      }
    }
  }

  // fsocket and bsocket

  send(direction, buffer) {
    // reset timeout
    this._timeout = __TIMEOUT__;

    if (direction === MIDDLEWARE_DIRECTION_UPWARD) {
      if (__IS_CLIENT__) {
        this.clientForward(buffer);
      } else {
        this.serverBackward(buffer);
      }
    } else {
      if (__IS_CLIENT__) {
        this.clientBackward(buffer);
      } else {
        this.serverForward(buffer);
      }
    }
    Profile.totalOut += buffer.length;
  }

  clientForward(buffer) {
    if (this.isPipable) {
      this._fsocket.write(buffer);
      this._tracks.push(TRACK_CHAR_UPLOAD);
      this._tracks.push(buffer.length);
    }
  }

  serverForward(buffer) {
    if (this.isPipable) {
      this._fsocket.write(buffer);
    }
  }

  serverBackward(buffer) {
    if (this.isPipable) {
      this._bsocket.write(buffer);
      this._tracks.push(TRACK_CHAR_UPLOAD);
      this._tracks.push(buffer.length);
    }
  }

  clientBackward(buffer) {
    if (this.isPipable) {
      this._bsocket.write(buffer);
    }
  }

  /**
   * connect to a server, for both client and server
   * @param host
   * @param port
   * @param callback
   * @returns {Promise.<void>}
   */
  async connect({host, port}, callback) {
    // host could be empty, see https://github.com/blinksocks/blinksocks/issues/34
    if (host && port) {
      logger.info(`[socket] [${this.remote}] connecting to: ${host}:${port}`);
      this._tracks.push(`${host}:${port}`);
      try {
        const ip = await dnsCache.get(host);
        this._fsocket = net.connect({host: ip, port}, callback);
        this._fsocket.on('error', this.onError);
        this._fsocket.on('close', this.onClose);
        this._fsocket.on('data', this.onBackward);
      } catch (err) {
        logger.error(`[socket] [${this.remote}] connect to ${host}:${port} failed due to: ${err.message}`);
      }
    } else {
      logger.warn(`unexpected host=${host} port=${port}`);
      this.onClose();
    }
  }

  // pipe

  /**
   * create pipes for both data forward and backward
   */
  createPipe(addr) {
    const presets = __PRESETS__.map(
      (preset, i) => createMiddleware(preset.name, {
        ...preset.params,
        ...(i === 0 ? addr : {})
      })
    );
    this._pipe = new Pipe({onNotified: this.onPipeNotified.bind(this)});
    this._pipe.setMiddlewares(MIDDLEWARE_DIRECTION_UPWARD, presets);
    this._pipe.on(`next_${MIDDLEWARE_DIRECTION_UPWARD}`, (buf) => this.send(MIDDLEWARE_DIRECTION_UPWARD, buf));
    this._pipe.on(`next_${MIDDLEWARE_DIRECTION_DOWNWARD}`, (buf) => this.send(MIDDLEWARE_DIRECTION_DOWNWARD, buf));
  }

  /**
   * if no action were caught by middlewares
   * @param action
   * @returns {*}
   */
  onPipeNotified(action) {
    if (__IS_SERVER__ && action.type === SOCKET_CONNECT_TO_DST) {
      const {targetAddress, onConnected} = action.payload;
      return this.connect(targetAddress, () => {
        this._isHandshakeDone = true;
        onConnected();
      });
    }
    if (action.type === PROCESSING_FAILED) {
      return this.onPresetFailed(action);
    }
  }

  /**
   * if any preset failed, this function will be called
   * @param action
   */
  onPresetFailed(action) {
    const {message, orgData} = action.payload;
    if (__IS_SERVER__ && __REDIRECT__ !== '' && this._fsocket === null) {
      const [host, port] = __REDIRECT__.split(':');
      logger.error(`[socket] [${this.remote}] connection is redirected to ${host}:${port} due to: ${message}`);
      this.connect({host, port}, () => {
        this._isRedirect = true;
        this._fsocket.write(orgData);
      });
    } else {
      const timeout = Utils.getRandomInt(10, 40);
      logger.error(`[socket] [${this.remote}] connection will be closed in ${timeout}s due to: ${message}`);
      setTimeout(() => this.onClose(), timeout * 1e3);
    }
    Profile.fatals += 1;
  }

  // methods

  /**
   * initialize timeout
   */
  setupTimeout() {
    this._timeout = __TIMEOUT__;
    this._timeout_timer = setInterval(() => {
      if (--this._timeout < 1) {
        logger.warn(`[socket] [${this.remote}] timeout: no I/O on the connection for ${__TIMEOUT__}s`);
        this.onClose();
      }
    }, 1e3);
  }

  /**
   * print connection track string, and only record the
   * leading and the trailing TRACK_MAX_SIZE / 2
   */
  dumpTrack() {
    let strs = [];
    let dp = 0, db = 0;
    let up = 0, ub = 0;
    let ud = '';
    for (const el of this._tracks) {
      if (el === TRACK_CHAR_UPLOAD || el === TRACK_CHAR_DOWNLOAD) {
        if (ud === el) {
          continue;
        }
        ud = el;
      }
      if (Number.isInteger(el)) {
        if (ud === TRACK_CHAR_DOWNLOAD) {
          dp += 1;
          db += el;
        }
        if (ud === TRACK_CHAR_UPLOAD) {
          up += 1;
          ub += el;
        }
      }
      strs.push(el);
    }
    const perSize = Math.floor(TRACK_MAX_SIZE / 2);
    if (strs.length > TRACK_MAX_SIZE) {
      strs = strs.slice(0, perSize).concat([' ... ']).concat(strs.slice(-perSize));
    }
    const summary = __IS_CLIENT__ ? `out/in = ${up}/${dp}, ${ub}b/${db}b` : `in/out = ${dp}/${up}, ${db}b/${ub}b`;
    logger.info(`[socket] [${this.remote}] closed with summary(${summary}) abstract(${strs.join(' ')})`);
  }

}
