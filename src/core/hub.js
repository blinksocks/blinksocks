import net from 'net';
import logger from 'winston';
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

  constructor() {
    this._hub = net.createServer();
    this._hub.on('error', this.onError.bind(this));
    this._hub.on('close', this.onClose.bind(this));
    this._hub.on('connection', this.onConnect.bind(this));
    this.onSocketClose = this.onSocketClose.bind(this);
  }

  onError(err) {
    logger.error(err);
    this._hub.close();
  }

  onClose() {
    console.info('==> [hub] shutdown');
    if (__IS_CLIENT__) {
      Balancer.destroy();
      console.info('==> [balancer] stopped');
    }
    if (__PROFILE__) {
      console.info('==> [profile] saving...');
      Profile.save();
      Profile.stop();
      console.info('==> [profile] stopped');
    }
    for (const socket of this._sockets) {
      socket.onClose();
    }
    process.exit(0);
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
    logger.info(`[hub] [${id}] ${socket.remoteAddress}:${socket.remotePort} connected`);
    Profile.connections += 1;
  }

  run() {
    const options = {
      host: __LOCAL_HOST__,
      port: __LOCAL_PORT__
    };
    this._hub.listen(options, () => {
      console.info('==> [hub] use configuration:');
      console.info(JSON.stringify(Config.abstract(), null, '  '));
      console.info(`==> [hub] is running as: ${__IS_SERVER__ ? 'Server' : 'Client'}`);
      console.info('==> [hub] is listening on:', this._hub.address());
      if (__IS_CLIENT__) {
        console.info('==> [balancer] started');
        Balancer.init(__SERVERS__);
      }
      if (__PROFILE__) {
        console.info('==> [profile] started');
        Profile.start();
      }
    });
  }

}
