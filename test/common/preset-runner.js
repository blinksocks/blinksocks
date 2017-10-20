import EventEmitter from 'events';
import {getPresetClassByName} from '../../src/presets';
import {
  Middleware,
  PIPE_ENCODE,
  PIPE_DECODE
} from '../../src/core/middleware';

export function setGlobals(obj) {
  Object.assign(global, obj);
}

export class PresetRunner extends EventEmitter {

  constructor({name, params = {}}, globals = {}) {
    super();
    setGlobals(globals);
    getPresetClassByName(name).checkParams(params);
    this.middleware = new Middleware({name, params});
  }

  notify(action) {
    this.middleware.notify(action);
  }

  destroy() {
    this.middleware.onDestroy();
  }

  async forward(data) {
    if (typeof data === 'string') {
      data = Buffer.from(data);
    }
    return new Promise((resolve, reject) => {
      this.middleware.on('post_1', resolve);
      this.middleware.on('post_-1', resolve);
      this.middleware.on('fail', reject);
      this.middleware.on('broadcast', (name, action) => this.emit('broadcast', action));
      this.middleware.write(__IS_CLIENT__ ? PIPE_ENCODE : PIPE_DECODE, {
        buffer: data,
        direct: resolve
      });
    });
  }

  async backward(data) {
    if (typeof data === 'string') {
      data = Buffer.from(data);
    }
    return new Promise((resolve, reject) => {
      this.middleware.on('post_1', resolve);
      this.middleware.on('post_-1', resolve);
      this.middleware.on('fail', reject);
      this.middleware.on('broadcast', (name, action) => this.emit('broadcast', action));
      this.middleware.write(__IS_CLIENT__ ? PIPE_DECODE : PIPE_ENCODE, {
        buffer: data,
        direct: resolve
      });
    });
  }

}
