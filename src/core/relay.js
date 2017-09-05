import EventEmitter from 'events';
import net from 'net';
import tls from 'tls';
import {logger, isValidHostname, isValidPort} from '../utils';
import {Pipe} from './pipe';
import {DNSCache} from './dns-cache';
import {
  MIDDLEWARE_DIRECTION_UPWARD,
  MIDDLEWARE_DIRECTION_DOWNWARD,
  createMiddleware
} from './middleware';

import {
  CONNECTION_CREATED,
  CONNECTION_CLOSED,
  CONNECT_TO_REMOTE,
  PRESET_FAILED,
  PRESET_CLOSE_CONNECTION,
  PRESET_PAUSE_RECV,
  PRESET_PAUSE_SEND,
  PRESET_RESUME_RECV,
  PRESET_RESUME_SEND
} from '../presets/defs';

import {BEHAVIOUR_EVENT_ON_PRESET_FAILED} from '../behaviours';

const MAX_BUFFERED_SIZE = 512 * 1024; // 512KB

/**
 * @description
 *   socket layer which handles both backward socket and forward socket.
 *
 * @events
 *   .on('close', () => {});
 */
export class Relay extends EventEmitter {

  _dnsCache = null;

  _isConnectedToDst = false;

  _remoteHost = '';

  _remotePort = '';

  _bsocket = null;

  _fsocket = null;

  _pipe = null;

  _presets = [];

  constructor({socket}) {
    super();
    this.onForward = this.onForward.bind(this);
    this.onBackward = this.onBackward.bind(this);
    this.onError = this.onError.bind(this);
    this.onBackwardSocketTimeout = this.onBackwardSocketTimeout.bind(this);
    this.onBackwardSocketClose = this.onBackwardSocketClose.bind(this);
    this.onForwardSocketTimeout = this.onForwardSocketTimeout.bind(this);
    this.onForwardSocketClose = this.onForwardSocketClose.bind(this);
    this.onPipeNotified = this.onPipeNotified.bind(this);
    this.sendForward = this.sendForward.bind(this);
    this.sendBackward = this.sendBackward.bind(this);
    this.connect = this.connect.bind(this);
    this.setPresets = this.setPresets.bind(this);
    this.destroy = this.destroy.bind(this);
    this._dnsCache = new DNSCache({expire: __DNS_EXPIRE__});
    this._remoteHost = socket.remoteAddress;
    this._remotePort = socket.remotePort;
    this._bsocket = socket;
    this._bsocket.on('error', this.onError);
    this._bsocket.on('close', this.onBackwardSocketClose);
    this._bsocket.on('timeout', this.onBackwardSocketTimeout.bind(this, {
      host: this._remoteHost,
      port: this._remotePort
    }));
    this._bsocket.on('data', this.onForward);
    this._bsocket.setTimeout(__TIMEOUT__);
    let presets = __PRESETS__;
    // prepend "proxy" preset to the top of presets on client side
    if (__IS_CLIENT__ && !['proxy', 'tunnel'].includes(presets[0].name)) {
      presets = [{name: 'proxy'}].concat(presets);
    }
    // add "tracker" preset to the preset list on both sides
    if (presets[presets.length - 1].name !== 'tracker') {
      presets = presets.concat([{name: 'tracker'}]);
    }
    this._presets = presets;
    this._pipe = this.createPipe(presets);
    this._pipe.broadcast('pipe', {
      type: CONNECTION_CREATED,
      payload: {
        host: this._remoteHost,
        port: this._remotePort
      }
    });
  }

  // getters

  get remote() {
    return `${this._remoteHost}:${this._remotePort}`;
  }

  get fsocketWritable() {
    return this._fsocket && !this._fsocket.destroyed && this._fsocket.writable;
  }

  get bsocketWritable() {
    return this._bsocket && !this._bsocket.destroyed && this._bsocket.writable;
  }

  // events

  onError(err) {
    logger.warn(`[relay] [${this.remote}] ${err.code || ''} - ${err.message}`);
  }

  // bsocket

  onForward(buffer) {
    if (this.fsocketWritable || !this._isConnectedToDst) {
      const direction = __IS_CLIENT__ ? MIDDLEWARE_DIRECTION_UPWARD : MIDDLEWARE_DIRECTION_DOWNWARD;
      this._pipe.feed(direction, buffer);
    }
    // throttle receiving data to reduce memory grow:
    // https://github.com/blinksocks/blinksocks/issues/60
    // https://nodejs.org/dist/latest/docs/api/net.html#net_socket_buffersize
    if (this._fsocket && this._fsocket.bufferSize >= MAX_BUFFERED_SIZE) {
      logger.debug(`[relay] bsocket recv paused due to fsocket.bufferSize=${this._fsocket.bufferSize} > ${MAX_BUFFERED_SIZE}`);
      this._bsocket.pause();
      this._fsocket.once('drain', () => {
        if (this._bsocket && !this._bsocket.destroyed) {
          logger.debug('[relay] bsocket resume to recv');
          this._bsocket.resume();
        }
      });
    }
  }

  onForwardSocketTimeout({host, port}) {
    logger.warn(`[relay] [${host}:${port}] timeout: no I/O on the connection for ${__TIMEOUT__ / 1e3}s`);
    this.onForwardSocketClose();
  }

  onForwardSocketClose() {
    if (this._fsocket) {
      this._fsocket.destroy();
      this._fsocket = null;
    }
    if (this._bsocket) {
      // https://github.com/nodejs/node/issues/15005
      const bufferSize = this._bsocket.bufferSize - (__IS_TLS__ ? 1 : 0);
      if (bufferSize > 0) {
        this._bsocket.once('drain', this.onBackwardSocketClose);
      } else {
        this.onBackwardSocketClose();
      }
    }
  }

  // fsocket

  onBackward(buffer) {
    if (this.bsocketWritable) {
      const direction = __IS_CLIENT__ ? MIDDLEWARE_DIRECTION_DOWNWARD : MIDDLEWARE_DIRECTION_UPWARD;
      this._pipe.feed(direction, buffer);
    }
    // throttle receiving data to reduce memory grow:
    // https://github.com/blinksocks/blinksocks/issues/60
    // https://nodejs.org/dist/latest/docs/api/net.html#net_socket_buffersize
    if (this._bsocket && this._bsocket.bufferSize >= MAX_BUFFERED_SIZE) {
      logger.debug(`[relay] fsocket recv paused due to bsocket.bufferSize=${this._bsocket.bufferSize} > ${MAX_BUFFERED_SIZE}`);
      this._fsocket.pause();
      this._bsocket.once('drain', () => {
        if (this._fsocket && !this._fsocket.destroyed) {
          logger.debug('[relay] fsocket resume to recv');
          this._fsocket.resume();
        }
      });
    }
  }

  onBackwardSocketTimeout({host, port}) {
    logger.warn(`[relay] [${host}:${port}] timeout: no I/O on the connection for ${__TIMEOUT__ / 1e3}s`);
    this.onBackwardSocketClose();
  }

  onBackwardSocketClose() {
    if (this._bsocket) {
      this._bsocket.destroy();
      this._bsocket = null;
      this._pipe.broadcast('pipe', {
        type: CONNECTION_CLOSED,
        payload: {
          host: this._remoteHost,
          port: this._remotePort
        }
      });
      this._pipe.destroy();
      this._pipe = null;
      this.emit('close');
    }
    if (this._fsocket) {
      // https://github.com/nodejs/node/issues/15005
      const bufferSize = this._fsocket.bufferSize - (__IS_TLS__ ? 1 : 0);
      if (bufferSize > 0) {
        this._fsocket.once('drain', this.onForwardSocketClose);
      } else {
        this.onForwardSocketClose();
      }
    }
  }

  // methods

  sendForward(buffer) {
    if (__IS_CLIENT__) {
      this.fsocketWritable && this._fsocket.write(buffer);
    } else {
      this.bsocketWritable && this._bsocket.write(buffer);
    }
  }

  sendBackward(buffer) {
    if (__IS_CLIENT__) {
      this.bsocketWritable && this._bsocket.write(buffer);
    } else {
      this.fsocketWritable && this._fsocket.write(buffer);
    }
  }

  /**
   * connect to another endpoint, for both client and server
   * @param host
   * @param port
   * @returns {Promise}
   */
  async connect({host, port}) {
    // host could be empty, see https://github.com/blinksocks/blinksocks/issues/34
    if (!isValidHostname(host) || !isValidPort(port)) {
      logger.warn(`unexpected host=${host} port=${port}`);
      this.onBackwardSocketClose();
      return;
    }
    // resolve host name
    let ip = null;
    try {
      ip = await this._dnsCache.get(host);
    } catch (err) {
      logger.error(`[relay] [${this.remote}] fail to resolve host ${host}:${port}: ${err.message}`);
    }
    logger.info(`[relay] [${this.remote}] connecting to: ${host}(${ip}):${port}`);
    return new Promise((resolve) => {
      // close living connection before create a new connection
      if (this._fsocket && !this._fsocket.destroyed) {
        this._fsocket.destroy();
        this._fsocket = null;
      }
      if (__IS_CLIENT__ && __IS_TLS__) {
        this._fsocket = tls.connect({host, port, ca: [__TLS_CERT__]}, () => resolve(this._fsocket));
      } else {
        this._fsocket = net.connect({host: ip, port}, () => resolve(this._fsocket));
      }
      this._fsocket.on('error', this.onError);
      this._fsocket.on('close', this.onForwardSocketClose);
      this._fsocket.on('timeout', this.onForwardSocketTimeout.bind(this, {host, port}));
      this._fsocket.on('data', this.onBackward);
      this._fsocket.setTimeout(__TIMEOUT__);
    });
  }

  /**
   * set a new presets and recreate the pipe
   * @param callback
   */
  setPresets(callback) {
    this._presets = callback(this._presets);
    this._pipe.destroy();
    this._pipe = this.createPipe(this._presets);
  }

  /**
   * create pipes for both data forward and backward
   */
  createPipe(presets) {
    const middlewares = presets.map((preset) => createMiddleware(preset.name, preset.params || {}));
    const pipe = new Pipe();
    pipe.on('broadcast', this.onPipeNotified);
    pipe.on(`next_${MIDDLEWARE_DIRECTION_UPWARD}`, this.sendForward);
    pipe.on(`next_${MIDDLEWARE_DIRECTION_DOWNWARD}`, this.sendBackward);
    pipe.setMiddlewares(middlewares);
    return pipe;
  }

  /**
   * if no action were caught by middlewares
   * @param action
   * @returns {*}
   */
  async onPipeNotified(action) {
    switch (action.type) {
      case CONNECT_TO_REMOTE: {
        const {host, port, onConnected} = action.payload;
        if (__IS_SERVER__) {
          await this.connect({host, port});
        }
        if (__IS_CLIENT__) {
          logger.info(`[relay] [${this.remote}] request: ${host}:${port}`);
          await this.connect({host: __SERVER_HOST__, port: __SERVER_PORT__});
        }
        this._isConnectedToDst = true;
        if (typeof onConnected === 'function') {
          onConnected();
        }
        break;
      }
      case PRESET_FAILED: {
        const props = {
          remoteHost: this._remoteHost,
          remotePort: this._remotePort,
          onClose: this.destroy,
          connect: this.connect,
          setPresets: this.setPresets,
          action: action
        };
        const {name, message} = action.payload;
        logger.error(`[relay] [${this.remote}] preset "${name}" fail to process: ${message}`);
        await __BEHAVIOURS__[BEHAVIOUR_EVENT_ON_PRESET_FAILED].run(props);
        break;
      }
      case PRESET_CLOSE_CONNECTION: {
        logger.info(`[relay] [${this.remote}] preset request to close connection`);
        this.destroy();
        break;
      }
      case PRESET_PAUSE_RECV:
        __IS_SERVER__ ?
          (this._bsocket && this._bsocket.pause()) :
          (this._fsocket && this._fsocket.pause());
        break;
      case PRESET_PAUSE_SEND:
        __IS_SERVER__ ?
          (this._fsocket && this._fsocket.pause()) :
          (this._bsocket && this._bsocket.pause());
        break;
      case PRESET_RESUME_RECV:
        __IS_SERVER__ ?
          (this._bsocket && this._bsocket.resume()) :
          (this._fsocket && this._fsocket.resume());
        break;
      case PRESET_RESUME_SEND:
        __IS_SERVER__ ?
          (this._fsocket && this._fsocket.resume()) :
          (this._bsocket && this._bsocket.resume());
        break;
      default:
        break;
    }
  }

  /**
   * close both sides
   */
  destroy() {
    this.onForwardSocketClose();
    this.onBackwardSocketClose();
  }

}
