import EventEmitter from 'events';
import net from 'net';
import {getRandomInt} from '../utils';
import Logger from './logger';
import {Config} from './config';
import {DNSCache} from './dns-cache';
import {Balancer} from './balancer';
import {Pipe} from './pipe';
import {
  MIDDLEWARE_DIRECTION_UPWARD,
  MIDDLEWARE_DIRECTION_DOWNWARD,
  createMiddleware
} from './middleware';

import {
  SOCKET_CONNECT_TO_REMOTE,
  PROCESSING_FAILED
} from '../presets/defs';

const TRACK_CHAR_UPLOAD = '↑';
const TRACK_CHAR_DOWNLOAD = '↓';
const TRACK_MAX_SIZE = 40;
const MAX_BUFFERED_SIZE = 1024 * 1024; // 1MB

let logger = null;
let lastServer = null;

function selectServer() {
  const server = Balancer.getFastest();
  if (lastServer === null || server.id !== lastServer.id) {
    Config.initServer(server);
    lastServer = server;
    logger.info(`[balancer] use: ${server.host}:${server.port}`);
  }
}

/**
 * @description
 *   socket layer which handles both backward socket and forward socket.
 *
 * @events
 *   .on('close', () => {});
 *   .on('stat', ({stat}) => {});
 */
export class Socket extends EventEmitter {

  _dnsCache = null;

  _isConnectedToDst = false;

  _remoteAddress = '';

  _remotePort = '';

  _bsocket = null;

  _fsocket = null;

  _pipe = null;

  _isRedirect = false; // server only

  // +---+-----------------------+---+
  // | C | d <--> u     u <--> d | S |
  // +---+-----------------------+---+
  _tracks = []; // ['source', 'target', 'u', '20', 'u', '20', 'd', '10', ...]

  constructor({socket}) {
    super();
    logger = Logger.getInstance();
    this.onForward = this.onForward.bind(this);
    this.onBackward = this.onBackward.bind(this);
    this.onError = this.onError.bind(this);
    this.onBackwardSocketDrain = this.onBackwardSocketDrain.bind(this);
    this.onBackwardSocketTimeout = this.onBackwardSocketTimeout.bind(this);
    this.onBackwardSocketClose = this.onBackwardSocketClose.bind(this);
    this.onForwardSocketDrain = this.onForwardSocketDrain.bind(this);
    this.onForwardSocketTimeout = this.onForwardSocketTimeout.bind(this);
    this.onForwardSocketClose = this.onForwardSocketClose.bind(this);
    this._dnsCache = new DNSCache({expire: __DNS_EXPIRE__});
    this._remoteAddress = socket.remoteAddress;
    this._remotePort = socket.remotePort;
    this._bsocket = socket;
    this._bsocket.on('error', this.onError);
    this._bsocket.on('close', this.onBackwardSocketClose);
    this._bsocket.on('timeout', this.onBackwardSocketTimeout.bind(this, {
      host: this._remoteAddress,
      port: this._remotePort
    }));
    this._bsocket.on('data', this.onForward);
    this._bsocket.on('drain', this.onBackwardSocketDrain);
    this._bsocket.setTimeout(__TIMEOUT__);
    if (__IS_SERVER__) {
      this._tracks.push(`${this._remoteAddress}:${this._remotePort}`);
    } else {
      selectServer();
    }
    this._pipe = this.createPipe();
  }

  // getters

  get remote() {
    return `${this._remoteAddress}:${this._remotePort}`;
  }

  get fsocketWritable() {
    return this._fsocket !== null && !this._fsocket.destroyed && this._fsocket.writable;
  }

  get bsocketWritable() {
    return this._bsocket !== null && !this._bsocket.destroyed && this._bsocket.writable;
  }

  // events

  onForward(buffer) {
    if (__IS_CLIENT__) {
      this.clientOut(buffer);
    } else {
      if (this._isRedirect) {
        // server redirect
        this.fsocketWritable && this._fsocket.write(buffer);
        return;
      }
      this.serverIn(buffer);
    }
    // throttle receiving data to reduce memory grow:
    // https://github.com/blinksocks/blinksocks/issues/60
    if (this._fsocket && this._fsocket.bufferSize >= MAX_BUFFERED_SIZE) {
      this._bsocket.pause();
    }
  }

  onBackward(buffer) {
    if (__IS_CLIENT__) {
      this.clientIn(buffer);
    } else {
      if (this._isRedirect) {
        // server redirect
        this.bsocketWritable && this._bsocket.write(buffer);
        return;
      }
      this.serverOut(buffer);
    }
    // throttle receiving data to reduce memory grow:
    // https://github.com/blinksocks/blinksocks/issues/60
    if (this._bsocket && this._bsocket.bufferSize >= MAX_BUFFERED_SIZE) {
      this._fsocket.pause();
    }
  }

  onError(err) {
    logger.warn(`[socket] [${this.remote}] ${err.code} - ${err.message}`);
  }

  /**
   * when client/server has no data to forward
   */
  onForwardSocketDrain() {
    if (this._bsocket !== null && !this._bsocket.destroyed) {
      this._bsocket.resume();
    } else {
      this.onForwardSocketClose();
    }
  }

  onForwardSocketTimeout({host, port}) {
    logger.warn(`[socket] [${host}:${port}] timeout: no I/O on the connection for ${__TIMEOUT__ / 1e3}s`);
    this.onForwardSocketClose();
  }

  /**
   * when server/destination want to close then connection
   */
  onForwardSocketClose() {
    if (this._fsocket !== null && !this._fsocket.destroyed) {
      this._fsocket.destroy();
    }
    if (this._bsocket && this._bsocket.bufferSize <= 0) {
      this.onBackwardSocketClose();
    }
    if (__IS_CLIENT__ && this._tracks.length > 0) {
      this.emit('stat', {stat: [].concat(this._tracks)});
      this.dumpTrack();
    }
    this._fsocket = null;
  }

  /**
   * when no incoming data send to client/server
   */
  onBackwardSocketDrain() {
    if (this._fsocket !== null && !this._fsocket.destroyed) {
      this._fsocket.resume();
    } else {
      this.onBackwardSocketClose();
    }
  }

  onBackwardSocketTimeout({host, port}) {
    logger.warn(`[socket] [${host}:${port}] timeout: no I/O on the connection for ${__TIMEOUT__ / 1e3}s`);
    this.onBackwardSocketClose();
  }

  /**
   * when application/client want to close the connection
   */
  onBackwardSocketClose() {
    if (this._bsocket !== null && !this._bsocket.destroyed) {
      this._bsocket.destroy();
    }
    if (this._fsocket && this._fsocket.bufferSize <= 0) {
      this.onForwardSocketClose();
    }
    if (__IS_SERVER__ && this._tracks.length > 0) {
      this.emit('stat', {stat: [].concat(this._tracks)});
      this.dumpTrack();
    }
    this._bsocket = null;
    this.emit('close');
  }

  // pipe chain

  clientOut(buffer) {
    if (this.fsocketWritable || !this._isConnectedToDst) {
      try {
        this._pipe.feed(MIDDLEWARE_DIRECTION_UPWARD, buffer);
      } catch (err) {
        logger.error(`[socket] [${this.remote}]`, err);
      }
    }
  }

  serverIn(buffer) {
    if (this.fsocketWritable || !this._isConnectedToDst) {
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
    if (this.bsocketWritable) {
      try {
        this._pipe.feed(MIDDLEWARE_DIRECTION_UPWARD, buffer);
      } catch (err) {
        logger.error(`[socket] [${this.remote}]`, err);
      }
    }
  }

  clientIn(buffer) {
    if (this.bsocketWritable) {
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
  }

  clientForward(buffer) {
    if (this.fsocketWritable) {
      this._fsocket.write(buffer);
      this._tracks.push(TRACK_CHAR_UPLOAD);
      this._tracks.push(buffer.length);
    }
  }

  serverForward(buffer) {
    if (this.fsocketWritable) {
      this._fsocket.write(buffer);
    }
  }

  serverBackward(buffer) {
    if (this.bsocketWritable) {
      this._bsocket.write(buffer);
      this._tracks.push(TRACK_CHAR_UPLOAD);
      this._tracks.push(buffer.length);
    }
  }

  clientBackward(buffer) {
    if (this.bsocketWritable) {
      this._bsocket.write(buffer);
    }
  }

  /**
   * connect to another endpoint, for both client and server
   * @param host
   * @param port
   * @param dstHost
   * @param dstPort
   * @param callback
   * @returns {Promise.<void>}
   */
  async connect({host, port, dstHost, dstPort}, callback) {
    // host could be empty, see https://github.com/blinksocks/blinksocks/issues/34
    if (host && port) {
      if (__IS_CLIENT__) {
        logger.info(`[socket] [${this.remote}] request: ${dstHost}:${dstPort}, connecting to: ${host}:${port}`);
      } else {
        logger.info(`[socket] [${this.remote}] connecting to: ${host}:${port}`);
      }
      this._tracks.push(`${host}:${port}`);
      try {
        const ip = await this._dnsCache.get(host);
        this._fsocket = net.connect({host: ip, port}, callback);
        this._fsocket.on('error', this.onError);
        this._fsocket.on('close', this.onForwardSocketClose);
        this._fsocket.on('timeout', this.onForwardSocketTimeout.bind(this, {host, port}));
        this._fsocket.on('data', this.onBackward);
        this._fsocket.on('drain', this.onForwardSocketDrain);
        this._fsocket.setTimeout(__TIMEOUT__);
      } catch (err) {
        logger.error(`[socket] [${this.remote}] connect to ${host}:${port} failed due to: ${err.message}`);
      }
    } else {
      logger.warn(`unexpected host=${host} port=${port}`);
      this.onBackwardSocketClose();
    }
  }

  // pipe

  /**
   * create pipes for both data forward and backward
   */
  createPipe() {
    let presets = __PRESETS__;
    // prepend "proxy" preset to the top of presets on client side
    if (__IS_CLIENT__ && presets[0].name !== 'proxy') {
      presets = [{name: 'proxy'}].concat(presets);
    }
    // create middlewares and pipe
    const middlewares = presets.map((preset) => createMiddleware(preset.name, preset.params || {}));
    const pipe = new Pipe({onNotified: this.onPipeNotified.bind(this)});
    pipe.setMiddlewares(MIDDLEWARE_DIRECTION_UPWARD, middlewares);
    pipe.on(`next_${MIDDLEWARE_DIRECTION_UPWARD}`, (buf) => this.send(MIDDLEWARE_DIRECTION_UPWARD, buf));
    pipe.on(`next_${MIDDLEWARE_DIRECTION_DOWNWARD}`, (buf) => this.send(MIDDLEWARE_DIRECTION_DOWNWARD, buf));
    return pipe;
  }

  /**
   * if no action were caught by middlewares
   * @param action
   * @returns {*}
   */
  onPipeNotified(action) {
    switch (action.type) {
      case SOCKET_CONNECT_TO_REMOTE: {
        const {targetAddress, onConnected} = action.payload;
        if (__IS_SERVER__) {
          // connect to destination
          this.connect(targetAddress, () => {
            this._isConnectedToDst = true;
            (typeof onConnected === 'function') && onConnected();
          });
        }
        if (__IS_CLIENT__) {
          // select a server via Balancer
          selectServer();
          // connect to our server
          const [dstHost, dstPort] = [targetAddress.host, targetAddress.port];
          this.connect({host: __SERVER_HOST__, port: __SERVER_PORT__, dstHost, dstPort}, () => {
            this._tracks.push(`${dstHost}:${dstPort}`);
            this._isConnectedToDst = true;
            (typeof onConnected === 'function') && onConnected();
          });
        }
        break;
      }
      case PROCESSING_FAILED:
        this.onPresetFailed(action);
        break;
      default:
        break;
    }
  }

  /**
   * if any preset failed, this function will be called
   * @param action
   */
  onPresetFailed(action) {
    const {name, message, orgData} = action.payload;
    logger.error(`[socket] [${this.remote}] preset "${name}" fail to process: ${message}`);
    if (__IS_SERVER__ && __REDIRECT__ && this._fsocket === null) {
      const [host, port] = __REDIRECT__.split(':');
      logger.warn(`[socket] [${this.remote}] connection is redirecting to ${host}:${port}...`);
      this.connect({host, port}, () => {
        this._isRedirect = true;
        this.fsocketWritable && this._fsocket.write(orgData);
      });
    } else {
      const timeout = getRandomInt(10, 40);
      logger.warn(`[socket] [${this.remote}] connection will be closed in ${timeout}s...`);
      setTimeout(this.destroy.bind(this), timeout * 1e3);
    }
  }

  // methods

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
    this._tracks = [];
  }

  /**
   * close both sides
   */
  destroy() {
    this.onForwardSocketClose();
    this.onBackwardSocketClose();
  }

}
