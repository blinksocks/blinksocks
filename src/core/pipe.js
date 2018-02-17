import EventEmitter from 'events';
import { Preset } from './preset';
import { PIPE_ENCODE } from '../constants';
import { PRESET_FAILED } from '../presets/actions';
import { logger } from '../utils';

// .on('broadcast')
// .on(`post_${direction}`)
export class Pipe extends EventEmitter {

  _config = null;

  _isPipingUdp = false;

  _encode_presets = [];

  _decode_presets = [];

  _cacheBuffer = null;

  _rawPresets = null;

  _destroyed = false;

  get destroyed() {
    return this._destroyed;
  }

  get presets() {
    return this._presets;
  }

  constructor({ config, presets, isUdp = false }) {
    super();
    this._config = config;
    this._isPipingUdp = isUdp;
    // presets
    const _presets = presets.map(this._createPreset.bind(this));
    this._encode_presets = _presets;
    this._decode_presets = [].concat(_presets).reverse();
    this._rawPresets = presets;
  }

  broadcast = (name, action) => {
    const presets = this.getPresets();
    const results = [];
    for (const preset of presets) {
      if (preset.name !== name) {
        results.push(preset.notify(action));
      }
    }
    // if no preset handled this action, bubble up to where pipe created.
    if (name !== 'pipe' && results.every((result) => !!result === false)) {
      this.emit('broadcast', action);
    }
  };

  onReadProperty = (fromName, targetName, propertyName) => {
    const presets = this.getPresets();
    const preset = presets.find((m) => m.name === targetName);
    if (preset) {
      const impl = preset.getImplement();
      const value = impl[propertyName];
      return value !== undefined ? value : impl.constructor[propertyName];
    } else {
      logger.warn(`[preset] "${fromName}" cannot read property from nonexistent preset "${targetName}".`);
    }
  };

  getPresets(direction = PIPE_ENCODE) {
    if (direction === PIPE_ENCODE) {
      return this._encode_presets || [];
    } else {
      return this._decode_presets || [];
    }
  }

  updatePresets(rawPresets) {
    // create index of previous presets for fast locate
    const mdIndex = {};
    for (const preset of this.getPresets()) {
      mdIndex[preset.name] = preset;
    }
    // create non-exist preset and reuse exist one
    const presets = [];
    for (let i = 0; i < rawPresets.length; i++) {
      const rawPreset = rawPresets[i];
      let preset = mdIndex[rawPreset.name];
      if (preset) {
        // remove all listeners for later re-chain later in _feed()
        preset.removeAllListeners();
        // keep common listeners
        this._attachEvents(preset);
        delete mdIndex[rawPreset.name];
      } else {
        preset = this._createPreset(rawPreset, i);
      }
      presets.push(preset);
    }
    // destroy redundant presets
    Object.keys(mdIndex).forEach((key) => mdIndex[key].destroy());
    // update members
    this._encode_presets = presets;
    this._decode_presets = [].concat(presets).reverse();
    this._presets = rawPresets;
  }

  feed(direction, buffer, extraArgs) {
    try {
      // cache the current buffer for PRESET_FAILED action
      this._cacheBuffer = buffer;
      // pre-feed hook
      const preEventName = `pre_${direction}`;
      if (this.listenerCount(preEventName) > 0) {
        this.emit(preEventName, buffer, (buf) => this._feed(direction, buf, extraArgs));
      } else {
        this._feed(direction, buffer, extraArgs);
      }
    } catch (err) {
      logger.error('[pipe] error occurred while piping:', err);
    }
  }

  destroy() {
    if (!this._destroyed) {
      this.getPresets().forEach((preset) => preset.destroy());
      this._encode_presets = null;
      this._decode_presets = null;
      this._rawPresets = null;
      this._cacheBuffer = null;
      this._destroyed = true;
      this.removeAllListeners();
    }
  }

  _createPreset(rawPreset, index) {
    const _preset = new Preset({ config: this._config, preset: rawPreset });
    this._attachEvents(_preset);
    // set readProperty() and getStore()
    const impl = _preset.getImplement();
    impl.readProperty = (...args) => this.onReadProperty(_preset.name, ...args);
    impl.getStore = () => this._config.stores[index];
    return _preset;
  }

  _attachEvents(preset) {
    preset.setMaxListeners(4);
    preset.on('broadcast', this.broadcast);
    preset.on('fail', (name, message) => void this.broadcast(name, {
      type: PRESET_FAILED,
      payload: {
        name,
        message,
        orgData: this._cacheBuffer,
      },
    }));
  }

  _feed(direction, buffer, extraArgs) {
    const presets = this.getPresets(direction);
    // args to be injected
    const isUdp = this._isPipingUdp;
    const direct = (buf, isReverse = false) => this.emit(isReverse ? `post_${-direction}` : `post_${direction}`, buf);
    // create event chain among presets
    const event = `next_${direction}`;
    const first = presets[0];
    if (!first.hasListener(event)) {
      const last = presets.reduce((prev, next) => {
        prev.on(event, (buf) => next.write({ direction, buffer: buf, direct, isUdp }, extraArgs));
        return next;
      });
      // the last preset send data out via direct(buf, false)
      last.on(event, direct);
    }
    // begin pipe
    first.write({ direction, buffer, direct, isUdp }, extraArgs);
  }

}
