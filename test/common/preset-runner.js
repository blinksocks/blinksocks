import EventEmitter from 'events';
import {PIPE_ENCODE, PIPE_DECODE} from '../../src/constants';
import {Middleware} from '../../src/core/middleware';

export class PresetRunner extends EventEmitter {

  _config = null;

  constructor({name, params = {}}, config = {}) {
    super();
    this._config = config;
    this.middleware = new Middleware({config, preset: {name, params}});
  }

  notify(action) {
    this.middleware.notify(action);
  }

  destroy() {
    this.middleware.onDestroy();
  }

  async forward(data, isUdp = false) {
    if (typeof data === 'string') {
      data = Buffer.from(data);
    }
    return new Promise((resolve, reject) => {
      this.middleware.on('fail', reject);
      this.middleware.on('broadcast', (name, action) => this.emit('broadcast', action));
      this.middleware.write({
        direction: this._config.is_client ? PIPE_ENCODE : PIPE_DECODE,
        buffer: data,
        direct: resolve,
        isUdp
      });
    });
  }

  async backward(data, isUdp = false) {
    if (typeof data === 'string') {
      data = Buffer.from(data);
    }
    return new Promise((resolve, reject) => {
      this.middleware.on('fail', reject);
      this.middleware.on('broadcast', (name, action) => this.emit('broadcast', action));
      this.middleware.write({
        direction: this._config.is_client ? PIPE_DECODE : PIPE_ENCODE,
        buffer: data,
        direct: resolve,
        isUdp
      });
    });
  }

  async forwardUdp(data) {
    return await this.forward(data, true);
  }

  async backwardUdp(data) {
    return await this.backward(data, true);
  }

}
