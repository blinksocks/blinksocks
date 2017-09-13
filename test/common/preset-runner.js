export default class PresetRunner {

  constructor({clazz, params}) {
    this.preset = new clazz(params);
  }

  setGlobals(obj) {
    Object.assign(global, obj);
    return this;
  }

  notify(action) {
    this.preset.onNotified(action);
  }

  async forward(data) {
    return new Promise((resolve, reject) => {
      const next = (buffer) => {
        const args = {
          buffer: buffer,
          next: resolve,
          fail: reject,
          broadcast: this.preset.broadcast,
          direct: resolve
        };
        let ret = null;
        if (__IS_CLIENT__) {
          ret = this.preset.clientOut(args);
        } else {
          ret = this.preset.serverOut(args);
        }
        if (ret instanceof Buffer) {
          resolve(ret);
        }
      };
      const ret = this.preset.beforeOut({
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
    return new Promise((resolve, reject) => {
      const next = (buffer) => {
        const args = {
          buffer: buffer,
          next: resolve,
          fail: reject,
          broadcast: this.preset.broadcast,
          direct: resolve
        };
        let ret = null;
        if (__IS_CLIENT__) {
          ret = this.preset.clientIn(args);
        } else {
          ret = this.preset.serverIn(args);
        }
        if (ret instanceof Buffer) {
          resolve(ret);
        }
      };
      const ret = this.preset.beforeIn({
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
