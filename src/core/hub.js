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

  constructor(config) {
    Config.init(config);
    this._hub = net.createServer();
    this._hub.on('error', this.onError.bind(this));
    this._hub.on('close', this.onClose.bind(this));
    this._hub.on('connection', this.onConnect.bind(this));
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
    process.exit(0);
  }

  onConnect(socket) {
    const id = nextId();
    new Socket({id, socket});
    logger.info(`[hub] client[${id}] connected`);
    Profile.connections += 1;
  }

  run() {
    const options = {
      host: __LOCAL_HOST__,
      port: __LOCAL_PORT__
    };
    this._hub.listen(options, () => {
      console.info('==> [hub] use configuration:');
      console.info(Config.abstract());
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
