import { Inbound, Outbound } from './defs';
import { logger } from '../utils';
import { CONNECT_TO_REMOTE, CONNECTED_TO_REMOTE, PRESET_FAILED } from '../presets/actions';

export class MuxInbound extends Inbound {

  constructor(props) {
    super(props);
    this.onDrain = this.onDrain.bind(this);
    if (this._config.is_server) {
      const inbound = this.ctx.muxRelay.getInbound();
      inbound.on('drain', this.onDrain);
    } else {
      // TODO: when to this.emit('drain') ?
    }
  }

  get name() {
    return 'mux:inbound';
  }

  get bufferSize() {
    if (this._config.is_client) {
      const totalBufferSize = 0;
      // const subRelays = this.ctx.thisRelay.getSubRelays();
      // if (subRelays) {
      //   for (const relay of subRelays.values()) {
      //     const inbound = relay.getInbound();
      //     if (inbound) {
      //       totalBufferSize += inbound.bufferSize;
      //     }
      //   }
      // }
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
      case CONNECT_TO_REMOTE:
        if (socket && typeof socket.pause === 'function') {
          socket.pause();
        }
        break;
      case CONNECTED_TO_REMOTE:
        if (socket && typeof socket.resume === 'function') {
          socket.resume();
        }
        break;
      case PRESET_FAILED:
        this.onPresetFailed(action);
        break;
      default:
        break;
    }
  }

  async onPresetFailed(action) {
    const { name, message } = action.payload;
    logger.error(`[${this.name}] [${this.remote}] preset "${name}" fail to process: ${message}`);
    this.emit('_error', new Error(message));
    // TODO: maybe have more things to do rather than keep silent
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

export class MuxOutbound extends Outbound {

  _isFirstFrame = true;

  constructor(props) {
    super(props);
    this.onDrain = this.onDrain.bind(this);
    if (this._config.is_client) {
      const outbound = this.ctx.muxRelay.getOutbound();
      outbound.on('drain', this.onDrain);
    } else {
      // TODO: when to this.emit('drain') ?
    }
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
      // const subRelays = this.ctx.thisRelay.getSubRelays();
      // if (subRelays) {
      //   for (const relay of subRelays.values()) {
      //     const outbound = relay.getOutbound();
      //     if (outbound) {
      //       totalBufferSize += outbound.bufferSize;
      //     }
      //   }
      // }
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
        muxRelay.encode(buffer, { cid, ...proxyRequest });
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
