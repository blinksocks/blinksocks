'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MuxOutbound = exports.MuxInbound = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _defs = require('./defs');

var _utils = require('../utils');

var _actions = require('../presets/actions');

class MuxInbound extends _defs.Inbound {

  constructor(props) {
    super(props);
    this.onDrain = this.onDrain.bind(this);
    if (this._config.is_server) {
      const inbound = this.ctx.muxRelay.getInbound();
      inbound.on('drain', this.onDrain);
    } else {}
  }

  get name() {
    return 'mux:inbound';
  }

  get bufferSize() {
    if (this._config.is_client) {
      const totalBufferSize = 0;

      return totalBufferSize;
    } else {
      const inbound = this.ctx.muxRelay.getInbound();
      if (inbound) {
        return inbound.bufferSize;
      } else {
        return 0;
      }
    }
  }

  onBroadcast(action) {
    const socket = this.ctx.socket;
    switch (action.type) {
      case _actions.CONNECT_TO_REMOTE:
        socket && socket.pause();
        break;
      case _actions.CONNECTED_TO_REMOTE:
        socket && socket.resume();
        break;
      case _actions.PRESET_FAILED:
        this.onPresetFailed(action);
        break;
      default:
        break;
    }
  }

  async onPresetFailed(action) {
    const { name, message } = action.payload;
    _utils.logger.error(`[${this.name}] [${this.remote}] preset "${name}" fail to process: ${message}`);
    this.emit('_error', new Error(message));
  }

  onDrain() {
    this.emit('drain');
  }

  write(buffer) {
    if (this._config.is_server) {
      const { muxRelay, cid } = this.ctx;
      muxRelay.encode(buffer, { cid });
    }
  }

  close() {
    const doClose = () => {
      if (this._config.is_server) {
        const { muxRelay } = this.ctx;
        const inbound = muxRelay.getInbound();
        if (inbound) {
          inbound.removeListener('drain', this.onDrain);
        }
      }
      if (!this._destroyed) {
        this._destroyed = true;
        this.emit('close');
      }
    };
    if (this.bufferSize > 0) {
      this.once('drain', doClose);
    } else {
      doClose();
    }
  }

}

exports.MuxInbound = MuxInbound;
class MuxOutbound extends _defs.Outbound {

  constructor(props) {
    super(props);
    this._isFirstFrame = true;
    this.onDrain = this.onDrain.bind(this);
    if (this._config.is_client) {
      const outbound = this.ctx.muxRelay.getOutbound();
      outbound.on('drain', this.onDrain);
    } else {}
  }

  get bufferSize() {
    if (this._config.is_client) {
      const outbound = this.ctx.muxRelay.getOutbound();
      if (outbound) {
        return outbound.bufferSize;
      } else {
        return 0;
      }
    } else {
      const totalBufferSize = 0;

      return totalBufferSize;
    }
  }

  onDrain() {
    this.emit('drain');
  }

  write(buffer) {
    if (this._config.is_client) {
      const { muxRelay, proxyRequest, cid } = this.ctx;
      if (this._isFirstFrame) {
        this._isFirstFrame = false;
        muxRelay.encode(buffer, _extends({ cid }, proxyRequest));
      } else {
        muxRelay.encode(buffer, { cid });
      }
    }
  }

  close() {
    const doClose = () => {
      if (this._config.is_client) {
        const { muxRelay } = this.ctx;
        const outbound = muxRelay.getOutbound();
        if (outbound) {
          outbound.removeListener('drain', this.onDrain);
        }
      }
      if (!this._destroyed) {
        this._destroyed = true;
        this.emit('close');
      }
    };
    if (this.bufferSize > 0) {
      this.once('drain', doClose);
    } else {
      doClose();
    }
  }

}
exports.MuxOutbound = MuxOutbound;