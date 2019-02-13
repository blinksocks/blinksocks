"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Pipe = void 0;

var _events = _interopRequireDefault(require("events"));

var _utils = require("../utils");

var _constants = require("../constants");

var _presets3 = require("../presets");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class Pipe extends _events.default {
  get destroyed() {
    return this._destroyed;
  }

  constructor({
    config,
    presets: _presets2,
    isUdp = false,
    injector
  }) {
    super();

    _defineProperty(this, "_config", null);

    _defineProperty(this, "_isPipingUdp", false);

    _defineProperty(this, "_injector", () => void {});

    _defineProperty(this, "_encode_presets", []);

    _defineProperty(this, "_decode_presets", []);

    _defineProperty(this, "_cacheBuffer", null);

    _defineProperty(this, "_destroyed", false);

    _defineProperty(this, "broadcast", action => {
      this.emit('broadcast', action);
    });

    _defineProperty(this, "onReadProperty", (fromName, targetName, propertyName) => {
      const presets = this.getPresets();
      const preset = presets.find(m => m.name === targetName);

      if (preset) {
        const value = preset[propertyName];
        return value !== undefined ? value : preset.constructor[propertyName];
      } else {
        _utils.logger.warn(`[preset] "${fromName}" cannot read property from nonexistent preset "${targetName}".`);
      }
    });

    this._config = config;
    this._isPipingUdp = isUdp;
    this._injector = injector;

    const _presets = _presets2.map(this._createPreset.bind(this));

    this._encode_presets = _presets;
    this._decode_presets = [].concat(_presets).reverse();
  }

  initTargetAddress(args) {
    const presets = this.getPresets();

    for (const preset of presets) {
      if (preset instanceof _presets3.IPresetAddressing) {
        preset.onInitTargetAddress(args);
      }
    }
  }

  getPresets(type = _constants.PIPE_ENCODE) {
    if (type === _constants.PIPE_ENCODE) {
      return this._encode_presets || [];
    } else {
      return this._decode_presets || [];
    }
  }

  updatePresets(rawPresets) {
    const mdIndex = {};

    for (const preset of this.getPresets()) {
      mdIndex[preset.name] = preset;
    }

    const presets = [];

    for (let i = 0; i < rawPresets.length; i++) {
      const rawPreset = rawPresets[i];
      let preset = mdIndex[rawPreset.name];

      if (preset) {
        preset.removeAllListeners();

        this._attachEvents(preset);

        delete mdIndex[rawPreset.name];
      } else {
        preset = this._createPreset(rawPreset, i);
      }

      presets.push(preset);
    }

    Object.keys(mdIndex).forEach(key => mdIndex[key].onDestroy());
    this._encode_presets = presets;
    this._decode_presets = [].concat(presets).reverse();
  }

  feed(type, buffer, extraArgs) {
    try {
      this._cacheBuffer = buffer;
      const preEventName = `pre_${type}`;

      if (this.listenerCount(preEventName) > 0) {
        this.emit(preEventName, buffer, buf => this._feed(type, buf, extraArgs));
      } else {
        this._feed(type, buffer, extraArgs);
      }
    } catch (err) {
      _utils.logger.error('[pipe] error occurred while piping: %s', err.stack);
    }
  }

  destroy() {
    if (!this._destroyed) {
      this.getPresets().forEach(preset => {
        preset.onDestroy();
        preset.removeAllListeners();
      });
      this._encode_presets = null;
      this._decode_presets = null;
      this._cacheBuffer = null;
      this._destroyed = true;
    }
  }

  _createPreset(rawPreset, index) {
    const {
      name,
      params = {},
      usePrivate
    } = rawPreset;
    const ImplClass = (0, _presets3.getPresetClassByName)(name, usePrivate);
    const preset = new ImplClass({
      config: this._config,
      params
    });

    preset.readProperty = (...args) => this.onReadProperty(preset.name, ...args);

    preset.getStore = () => this._config.stores[index];

    if (this._config.is_server && preset instanceof _presets3.IPresetAddressing) {
      preset.resolveTargetAddress = ({
        host,
        port
      }, callback) => {
        const action = {
          type: _constants.CONNECT_TO_REMOTE,
          payload: {
            host,
            port,
            onConnected: callback
          }
        };
        this.broadcast(action);
      };
    }

    if (typeof this._injector === 'function') {
      this._injector(preset);
    }

    preset.onInit(params);

    this._attachEvents(preset);

    return preset;
  }

  _attachEvents(preset) {
    preset.setMaxListeners(3);
    preset.on('fail', (name, message) => void this.broadcast({
      type: _constants.PRESET_FAILED,
      payload: {
        name,
        message,
        orgData: this._cacheBuffer
      }
    }));
  }

  _feed(type, buffer, extraArgs) {
    const presets = this.getPresets(type);
    const isUdp = this._isPipingUdp;

    const direct = (buf, isReverse = false) => this.emit(isReverse ? `post_${-type}` : `post_${type}`, buf);

    if (presets.length < 1) {
      return direct(buffer);
    }

    const event = `next_${type}`;
    const first = presets[0];

    if (!first.listenerCount(event) > 0) {
      const last = presets.reduce((prev, next) => {
        prev.on(event, buf => next._write({
          type,
          buffer: buf,
          direct,
          isUdp
        }, extraArgs));
        return next;
      });
      last.on(event, direct);
    }

    first._write({
      type,
      buffer,
      direct,
      isUdp
    }, extraArgs);
  }

}

exports.Pipe = Pipe;