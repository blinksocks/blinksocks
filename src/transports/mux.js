import {Inbound, Outbound} from './defs';
import {CONNECT_TO_REMOTE, CONNECTED_TO_REMOTE, PRESET_FAILED} from '../presets/defs';
import {logger} from '../utils';

export class MuxInbound extends Inbound {

  constructor(props) {
    super(props);
    this.onDrain = this.onDrain.bind(this);
    if (__IS_SERVER__) {
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
    if (__IS_CLIENT__) {
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
        socket && socket.pause();
        break;
      case CONNECTED_TO_REMOTE:
        socket && socket.resume();
        break;
      case PRESET_FAILED:
        this.onPresetFailed(action);
        break;
      default:
        break;
    }
  }

  async onPresetFailed(action) {
    const {name, message} = action.payload;
    logger.error(`[${this.name}] [${this.remote}] preset "${name}" fail to process: ${message}`);
    // TODO: maybe have more things to do rather than keep silent
  }

  onDrain() {
    this.emit('drain');
  }

  write(buffer) {
    if (__IS_SERVER__) {
      const {muxRelay, cid} = this.ctx;
      muxRelay.encode(buffer, {cid});
    }
  }

  end() {
    // TODO: handle half close correctly in mux protocol
    this.close();
  }

  close() {
    const doClose = () => {
      if (__IS_SERVER__) {
        const {muxRelay, cid} = this.ctx;
        const inbound = muxRelay.getInbound();
        if (inbound) {
          inbound.removeListener('drain', this.onDrain);
        }
        muxRelay.destroySubRelay(cid);
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
    if (__IS_CLIENT__) {
      const outbound = this.ctx.muxRelay.getOutbound();
      outbound.on('drain', this.onDrain);
    } else {
      // TODO: when to this.emit('drain') ?
    }
  }

  get bufferSize() {
    if (__IS_CLIENT__) {
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
    if (__IS_CLIENT__) {
      const {muxRelay, proxyRequest, cid} = this.ctx;
      if (this._isFirstFrame) {
        this._isFirstFrame = false;
        muxRelay.encode(buffer, {cid, ...proxyRequest});
      } else {
        muxRelay.encode(buffer, {cid});
      }
    }
  }

  end() {
    // TODO: handle half close correctly in mux protocol
    this.close();
  }

  close() {
    const doClose = () => {
      if (__IS_CLIENT__) {
        const {muxRelay, cid} = this.ctx;
        const outbound = muxRelay.getOutbound();
        if (outbound) {
          outbound.removeListener('drain', this.onDrain);
        }
        muxRelay.destroySubRelay(cid);
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
