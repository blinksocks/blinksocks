import EventEmitter from 'events';
import {getPresetClassByName} from '../../src/presets';
import {PIPE_ENCODE, PIPE_DECODE} from '../../src/constants';
import {Middleware} from '../../src/core/middleware';


export class PresetRunner extends EventEmitter {
  _ctx = null;

  constructor({name, params = {}}, context = {}) {
    super();
    this._ctx = context;
    getPresetClassByName(name).checkParams(params);
    this.middleware = new Middleware({name, params}, context);
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
      this.middleware.on('post_1', resolve);
      this.middleware.on('post_-1', resolve);
      this.middleware.on('fail', reject);
      this.middleware.on('broadcast', (name, action) => this.emit('broadcast', action));
      this.middleware.write({
        direction: this._ctx.IS_CLIENT ? PIPE_ENCODE : PIPE_DECODE,
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
      this.middleware.on('post_1', resolve);
      this.middleware.on('post_-1', resolve);
      this.middleware.on('fail', reject);
      this.middleware.on('broadcast', (name, action) => this.emit('broadcast', action));
      this.middleware.write({
        direction: this._ctx.IS_CLIENT ? PIPE_DECODE : PIPE_ENCODE,
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
