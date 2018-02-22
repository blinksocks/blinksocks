'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Pipe = undefined;

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _preset2 = require('./preset');

var _constants = require('../constants');

var _actions = require('../presets/actions');

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Pipe extends _events2.default {

  get destroyed() {
    return this._destroyed;
  }

  get presets() {
    return this._rawPresets;
  }

  constructor({ config, presets, isUdp = false }) {
    super();

    _initialiseProps.call(this);

    this._config = config;
    this._isPipingUdp = isUdp;

    const _presets = presets.map(this._createPreset.bind(this));
    this._encode_presets = _presets;
    this._decode_presets = [].concat(_presets).reverse();
    this._rawPresets = presets;
  }

  getPresets(direction = _constants.PIPE_ENCODE) {
    if (direction === _constants.PIPE_ENCODE) {
      return this._encode_presets || [];
    } else {
      return this._decode_presets || [];
    }
  }

  updatePresets(rawPresets) {
    const mdIndex = {};
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = this.getPresets()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        const preset = _step.value;

        mdIndex[preset.name] = preset;
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
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

    Object.keys(mdIndex).forEach(key => mdIndex[key].destroy());

    this._encode_presets = presets;
    this._decode_presets = [].concat(presets).reverse();
    this._presets = rawPresets;
  }

  feed(direction, buffer, extraArgs) {
    try {
      this._cacheBuffer = buffer;

      const preEventName = `pre_${direction}`;
      if (this.listenerCount(preEventName) > 0) {
        this.emit(preEventName, buffer, buf => this._feed(direction, buf, extraArgs));
      } else {
        this._feed(direction, buffer, extraArgs);
      }
    } catch (err) {
      _utils.logger.error('[pipe] error occurred while piping:', err);
    }
  }

  destroy() {
    if (!this._destroyed) {
      this.getPresets().forEach(preset => preset.destroy());
      this._encode_presets = null;
      this._decode_presets = null;
      this._rawPresets = null;
      this._cacheBuffer = null;
      this._destroyed = true;
      this.removeAllListeners();
    }
  }

  _createPreset(rawPreset, index) {
    const _preset = new _preset2.Preset({ config: this._config, preset: rawPreset });
    this._attachEvents(_preset);

    const impl = _preset.getImplement();
    impl.readProperty = (...args) => this.onReadProperty(_preset.name, ...args);
    impl.getStore = () => this._config.stores[index];
    return _preset;
  }

  _attachEvents(preset) {
    preset.setMaxListeners(4);
    preset.on('broadcast', this.broadcast);
    preset.on('fail', (name, message) => void this.broadcast(name, {
      type: _actions.PRESET_FAILED,
      payload: {
        name,
        message,
        orgData: this._cacheBuffer
      }
    }));
  }

  _feed(direction, buffer, extraArgs) {
    const presets = this.getPresets(direction);

    const isUdp = this._isPipingUdp;
    const direct = (buf, isReverse = false) => this.emit(isReverse ? `post_${-direction}` : `post_${direction}`, buf);

    if (presets.length < 1) {
      return direct(buffer);
    }

    const event = `next_${direction}`;
    const first = presets[0];
    if (!first.hasListener(event)) {
      const last = presets.reduce((prev, next) => {
        prev.on(event, buf => next.write({ direction, buffer: buf, direct, isUdp }, extraArgs));
        return next;
      });

      last.on(event, direct);
    }

    first.write({ direction, buffer, direct, isUdp }, extraArgs);
  }

}
exports.Pipe = Pipe;

var _initialiseProps = function _initialiseProps() {
  this._config = null;
  this._isPipingUdp = false;
  this._encode_presets = [];
  this._decode_presets = [];
  this._cacheBuffer = null;
  this._rawPresets = null;
  this._destroyed = false;

  this.broadcast = (name, action) => {
    const presets = this.getPresets();
    const results = [];
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = presets[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        const preset = _step2.value;

        if (preset.name !== name) {
          results.push(preset.notify(action));
        }
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    if (name !== 'pipe' && results.every(result => !!result === false)) {
      this.emit('broadcast', action);
    }
  };

  this.onReadProperty = (fromName, targetName, propertyName) => {
    const presets = this.getPresets();
    const preset = presets.find(m => m.name === targetName);
    if (preset) {
      const impl = preset.getImplement();
      const value = impl[propertyName];
      return value !== undefined ? value : impl.constructor[propertyName];
    } else {
      _utils.logger.warn(`[preset] "${fromName}" cannot read property from nonexistent preset "${targetName}".`);
    }
  };
};