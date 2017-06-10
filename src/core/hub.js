import net from 'net';
import logger from './logger';
import {Config} from './config';
import {Socket} from './socket';
import {Profile} from './profile';
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

export class Hub {

  _hub = null; // instance of class net.Server

  _sockets = []; // instances of our class Socket

  _isClosed = false;

  constructor(config) {
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
      if (__PROFILE__) {
        logger.info('==> [profile] saving...');
        Profile.save();
        Profile.stop();
        logger.info('==> [profile] stopped');
      }
      this._isClosed = true;
      this._sockets.forEach((socket) => socket.destroy());
      this._sockets = [];
    }
  }

  onSocketClose(socket) {
    this._sockets = this._sockets.filter(({id}) => id !== socket.id);
    Profile.connections = this._sockets.length;
    // NOTE: would better not force gc manually
    // global.gc && global.gc();
  }

  onConnect(socket) {
    const id = nextId();
    const instance = new Socket({
      id,
      socket,
      onClose: this.onSocketClose
    });
    this._sockets.push(instance);
    logger.info(`[hub] [${socket.remoteAddress}:${socket.remotePort}] connected`);
    Profile.connections += 1;
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
      if (__PROFILE__) {
        logger.info('==> [profile] started');
        Profile.start();
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
