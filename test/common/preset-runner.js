export class PresetRunner {

  constructor({clazz, params = {}}, globals = {}) {
    this.setGlobals(globals);
    clazz.checkParams(params);
    clazz.onInit(params);
    this.preset = new clazz(params);
  }

  getPreset() {
    return this.preset;
  }

  setGlobals(obj) {
    Object.assign(global, obj);
    return this;
  }

  notify(action) {
    this.preset.onNotified(action);
  }

  destroy() {
    this.preset.onDestroy();
  }

  async forward(data) {
    if (typeof data === 'string') {
      data = Buffer.from(data);
    }
    return new Promise((resolve, reject) => {
      const next = (buffer) => {
        const args = {
          buffer: buffer,
          next: resolve,
          fail: reject,
          broadcast: this.preset.broadcast,
          direct: resolve
        };
        const ret = this.preset[__IS_CLIENT__ ? 'clientOut' : 'serverIn'](args);
        if (ret instanceof Buffer) {
          resolve(ret);
        }
      };
      const ret = this.preset[__IS_CLIENT__ ? 'beforeOut' : 'beforeIn']({
        buffer: data,
        fail: reject,
        next: next,
        broadcast: this.preset.broadcast
      });
      if (ret instanceof Buffer) {
        next(ret);
      }
    });
  }

  async backward(data) {
    if (typeof data === 'string') {
      data = Buffer.from(data);
    }
    return new Promise((resolve, reject) => {
      const next = (buffer) => {
        const args = {
          buffer: buffer,
          next: resolve,
          fail: reject,
          broadcast: this.preset.broadcast,
          direct: resolve
        };
        const ret = this.preset[__IS_CLIENT__ ? 'clientIn' : 'serverOut'](args);
        if (ret instanceof Buffer) {
          resolve(ret);
        }
      };
      const ret = this.preset[__IS_CLIENT__ ? 'beforeIn' : 'beforeOut']({
        buffer: data,
        fail: reject,
        next: next,
        broadcast: this.preset.broadcast
      });
      if (ret instanceof Buffer) {
        next(ret);
      }
    });
  }

}
