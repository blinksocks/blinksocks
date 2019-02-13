"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.IPresetAddressing = exports.IPreset = void 0;

var _events = _interopRequireDefault(require("events"));

var _constants = require("../constants");

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class IPreset extends _events.default {
  _write({
    type,
    buffer,
    direct,
    isUdp
  }, extraArgs) {
    const postfix = (type === _constants.PIPE_ENCODE ? 'Out' : 'In') + (isUdp ? 'Udp' : '');

    const fail = message => void this.emit('fail', this.name, message);

    const next = (processed, isReverse = false) => {
      const hasListener = this.emit(`next_${isReverse ? -type : type}`, processed);

      if (!hasListener) {
        direct(processed, isReverse);
      }
    };

    const nextLifeCycleHook = (buf) => {
      const args = {
        buffer: buf,
        next,
        fail
      };
      const ret = this._config.is_client ? this[`client${postfix}`](args, extraArgs) : this[`server${postfix}`](args, extraArgs);

      if (ret instanceof Buffer) {
        next(ret);
      }
    };

    const args = {
      buffer,
      next: nextLifeCycleHook,
      fail
    };
    const ret = this[`before${postfix}`](args, extraArgs);

    if (ret instanceof Buffer) {
      nextLifeCycleHook(ret);
    }
  }

  get name() {
    return (0, _utils.kebabCase)(this.constructor.name).replace(/(.*)-preset/i, '$1');
  }

  static onCheckParams(params) {}

  static async onCache(params, store) {}

  constructor({
    config,
    params
  } = {}) {
    super();

    _defineProperty(this, "_config", null);

    this._config = config;
  }

  onInit(params) {}

  onDestroy() {}

  beforeOut({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  beforeIn({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  clientOut({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  serverIn({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  serverOut({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  clientIn({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  beforeOutUdp({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  beforeInUdp({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  clientOutUdp({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  serverInUdp({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  serverOutUdp({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  clientInUdp({
    buffer,
    next,
    fail
  }) {
    return buffer;
  }

  readProperty(presetName, propertyName) {}

  getStore() {}

}

exports.IPreset = IPreset;

class IPresetAddressing extends IPreset {
  onInitTargetAddress({
    host,
    port
  }) {}

  resolveTargetAddress({
    host,
    port
  }, callback) {}

}

exports.IPresetAddressing = IPresetAddressing;