/* eslint-disable no-undef */
import net from 'net';
import {Config} from './config';
import {Socket} from './socket';

const Logger = require('../utils/logger')(__filename);

const nextId = (function () {
  let i = 0;
  return () => ++i;
})();

export class Hub {

  _hub = null; // instance of class net.Server

  constructor(config) {
    // parse config json
    Config.init(config);
    Logger.setLevel(__LOG_LEVEL__);
    this._hub = net.createServer();
    this._hub.on('error', this.onError.bind(this));
    this._hub.on('close', this.onClose.bind(this));
    this._hub.on('connection', this.onConnect.bind(this));
  }

  onError(err) {
    Logger.error(err);
    this._hub.close();
  }

  onClose() {
    Logger.info('server shutdown');
  }

  onConnect(socket) {
    const id = nextId();
    new Socket({id, socket});
    Logger.info(`client[${id}] connected`);
  }

  run() {
    const options = {
      host: __LOCAL_HOST__,
      port: __LOCAL_PORT__
    };
    this._hub.listen(options, () => {
      Logger.info(`blinksocks is running as '${__IS_SERVER__ ? 'Server' : 'Client'}'`);
      Logger.info('opened hub on:', this._hub.address());
    });
  }

}
