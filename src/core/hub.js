import EventEmitter from 'events';
import net from 'net';
import logger from './logger';
import {Config} from './config';
import {Socket} from './socket';
import {Balancer} from './balancer';

const nextId = (function () {
  let i = 0;
  return () => {
    if (i > Number.MAX_SAFE_INTEGER - 1) {
      i = 0;
    }
    return ++i;
  };
})();

/**
 * @description
 *   gather and manage connections.
 *
 * @events
 *   .on('close', () => {});
 *   .on('socketClose', () => {});
 *   .on('socketStat', ({stat}) => {});
 */
export class Hub extends EventEmitter {

  _hub = null; // instance of class net.Server

  _sockets = []; // instances of our class Socket

  _isClosed = false;

  constructor(config) {
    super();
    if (typeof config !== 'undefined') {
      Config.init(config);
    }
    logger.level = __LOG_LEVEL__;
    this._hub = net.createServer();
    this._hub.on('close', this.onClose.bind(this));
    this._hub.on('connection', this.onConnect.bind(this));
    this.onSocketClose = this.onSocketClose.bind(this);
  }

  onClose() {
    if (!this._isClosed) {
      logger.info('==> [hub] shutdown');
      if (__IS_CLIENT__) {
        Balancer.destroy();
        logger.info('==> [balancer] stopped');
      }
      this._isClosed = true;
      this._sockets.forEach((socket) => socket.destroy());
      this._sockets = [];
      this.emit('close');
    }
  }

  onSocketClose(_id) {
    this._sockets = this._sockets.filter(({id}) => _id !== id);
    this.emit('socketClose');
    // NOTE: would better not force gc manually
    // global.gc && global.gc();
  }

  onConnect(socket) {
    const id = nextId();
    const sok = new Socket({id, socket});
    sok.on('close', () => this.onSocketClose(id));
    sok.on('stat', (...props) => this.emit('socketStat', ...props));
    this._sockets.push(sok);
    logger.info(`[hub] [${socket.remoteAddress}:${socket.remotePort}] connected`);
  }

  run(callback) {
    const options = {
      host: __LOCAL_HOST__,
      port: __LOCAL_PORT__
    };
    this._hub.listen(options, () => {
      logger.info(`==> [hub] use configuration: ${JSON.stringify(__ALL_CONFIG__)}`);
      logger.info(`==> [hub] running as: ${__IS_SERVER__ ? 'Server' : 'Client'}`);
      logger.info(`==> [hub] listening on: ${JSON.stringify(this._hub.address())}`);
      if (__IS_CLIENT__) {
        logger.info('==> [balancer] started');
        Balancer.start(__SERVERS__);
      }
      if (typeof callback === 'function') {
        callback();
      }
    });
  }

  terminate() {
    this._hub.close();
    this.onClose();
  }

}
