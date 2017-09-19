import EventEmitter from 'events';
import {getPresetClassByName} from '../../src/presets';
import {
  createMiddleware,
  MIDDLEWARE_DIRECTION_UPWARD,
  MIDDLEWARE_DIRECTION_DOWNWARD
} from '../../src/core/middleware';

export function setGlobals(obj) {
  Object.assign(global, obj);
}

export class PresetRunner extends EventEmitter {

  constructor({name, params = {}}, globals = {}) {
    super();
    setGlobals(globals);
    getPresetClassByName(name).checkParams(params);
    this.middleware = createMiddleware(name, params);
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
      this.middleware.on('next_1', resolve);
      this.middleware.on('next_-1', resolve);
      this.middleware.on('fail', reject);
      this.middleware.on('broadcast', (name, action) => this.emit('broadcast', action));
      this.middleware.write(__IS_CLIENT__ ? MIDDLEWARE_DIRECTION_UPWARD : MIDDLEWARE_DIRECTION_DOWNWARD, {
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
      this.middleware.on('next_1', resolve);
      this.middleware.on('next_-1', resolve);
      this.middleware.on('fail', reject);
      this.middleware.on('broadcast', (name, action) => this.emit('broadcast', action));
      this.middleware.write(__IS_CLIENT__ ? MIDDLEWARE_DIRECTION_DOWNWARD : MIDDLEWARE_DIRECTION_UPWARD, {
        buffer: data,
        direct: resolve
      });
    });
  }

}
