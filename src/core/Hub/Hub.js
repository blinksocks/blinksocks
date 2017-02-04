import net from 'net';
import {Config} from '../Config';
import {Socket} from '../Socket';

const Logger = require('../../utils/logger')(__filename);

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
    new Socket({id: nextId(), socket});
  }

  run() {
    const [host, port] = [Config.host, Config.port];
    const options = {
      host,
      port,
      backlog: 511
    };
    this._hub.listen(options, () => {
      Logger.info(`blinksocks is running as '${Config.isServer ? 'Server' : 'Client'}'`);
      Logger.info('opened hub on:', this._hub.address());
    });
  }

}
