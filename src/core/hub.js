import net from 'net';
import logger from 'winston';
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
    logger.info('hub shutdown');
    logger.info('stopping balancer');
    Balancer.destroy();
    process.exit(0);
  }

  onConnect(socket) {
    const id = nextId();
    new Socket({id, socket});
    logger.info(`client[${id}] connected`);
  }

  run() {
    const options = {
      host: __LOCAL_HOST__,
      port: __LOCAL_PORT__
    };
    this._hub.listen(options, () => {
      console.info('==> use configuration:');
      console.info(Config.abstract());
      console.info(`==> blinksocks is running as: ${__IS_SERVER__ ? 'Server' : 'Client'}`);
      console.info('==> blinksocks is listening on:', this._hub.address());
      if (__IS_CLIENT__) {
        console.info('==> starting balancer');
        Balancer.init(__SERVERS__);
      }
    });
  }

}
