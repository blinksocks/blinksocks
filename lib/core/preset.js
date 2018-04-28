'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Preset = undefined;

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _presets = require('../presets');

var _utils = require('../utils');

var _constants = require('../constants');

var _actions = require('../presets/actions');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Preset extends _events2.default {

  constructor({ config, preset }) {
    super();
    this._config = null;
    this._impl = null;

    this.onPresetNext = (direction, buffer) => {
      this.emit(`next_${direction}`, buffer);
    };

    this.onPresetBroadcast = action => {
      this.emit('broadcast', this.name, action);
    };

    this.onPresetFail = message => {
      this.emit('fail', this.name, message);
    };

    this.onResolveTargetAddress = ({ host, port }, cb) => {
      this.onPresetBroadcast({ type: _actions.CONNECT_TO_REMOTE, payload: { host, port, onConnected: cb } });
    };

    this._config = config;

    const { name, params = {} } = preset;
    const ImplClass = (0, _presets.getPresetClassByName)(name);
    this._impl = new ImplClass({ config, params });
    this._impl.next = this.onPresetNext;
    this._impl.broadcast = this.onPresetBroadcast;
    this._impl.fail = this.onPresetFail;
    this._impl.resolveTargetAddress = this.onResolveTargetAddress;
    this._impl.onInit(params);
  }

  get name() {
    return (0, _utils.kebabCase)(this._impl.constructor.name).replace(/(.*)-preset/i, '$1');
  }

  getImplement() {
    return this._impl;
  }

  hasListener(event) {
    return this.listenerCount(event) > 0;
  }

  write({ direction, buffer, direct, isUdp }, extraArgs) {
    const type = (direction === _constants.PIPE_ENCODE ? 'Out' : 'In') + (isUdp ? 'Udp' : '');

    const broadcast = this.onPresetBroadcast;
    const fail = this.onPresetFail;
    const next = (processed, isReverse = false) => {
      const hasListener = this.emit(`next_${isReverse ? -direction : direction}`, processed);
      if (!hasListener) {
        direct(processed, isReverse);
      }
    };

    const nextLifeCycleHook = (buf) => {
      const args = { buffer: buf, next, broadcast, direct, fail };
      const ret = this._config.is_client ? this._impl[`client${type}`](args, extraArgs) : this._impl[`server${type}`](args, extraArgs);
      if (ret instanceof Buffer) {
        next(ret);
      }
    };

    const args = { buffer, next: nextLifeCycleHook, broadcast, direct, fail };
    const ret = this._impl[`before${type}`](args, extraArgs);
    if (ret instanceof Buffer) {
      nextLifeCycleHook(ret);
    }
  }

  destroy() {
    this._impl.onDestroy();
  }

}
exports.Preset = Preset;