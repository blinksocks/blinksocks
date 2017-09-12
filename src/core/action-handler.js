// ======================================================
// + NOTICE:
// + This file is a partial of relay.js, please take care
// + of function calls and member access via "this".
// ======================================================

import {logger, getRandomInt} from '../utils';

import {
  CONNECT_TO_REMOTE,
  PRESET_FAILED,
  PRESET_CLOSE_CONNECTION,
  PRESET_PAUSE_RECV,
  PRESET_PAUSE_SEND,
  PRESET_RESUME_RECV,
  PRESET_RESUME_SEND
} from '../presets/defs';

const mapping = {
  [CONNECT_TO_REMOTE]: onConnectToRemote,
  [PRESET_FAILED]: onPresetFailed,
  [PRESET_CLOSE_CONNECTION]: onPresetCloseConnection,
  [PRESET_PAUSE_RECV]: onPresetPauseRecv,
  [PRESET_RESUME_RECV]: onPresetResumeRecv,
  [PRESET_PAUSE_SEND]: onPresetPauseSend,
  [PRESET_RESUME_SEND]: onPresetResumeSend
};

async function onConnectToRemote(action) {
  const {host, port, onConnected} = action.payload;
  if (__IS_SERVER__) {
    await this.connect({host, port});
  }
  if (__IS_CLIENT__) {
    logger.info(`[relay] [${this.remote}] request: ${host}:${port}`);
    await this.connect({host: __SERVER_HOST__, port: __SERVER_PORT__});
  }
  this._isConnectedToRemote = true;
  if (typeof onConnected === 'function') {
    onConnected();
  }
}

async function onPresetFailed(action) {
  const {name, message} = action.payload;
  logger.error(`[relay] [${this.remote}] preset "${name}" fail to process: ${message}`);

  // close connection directly on client side
  if (__IS_CLIENT__) {
    logger.warn(`[relay] [${this.remote}] connection closed`);
    this.destroy();
  }

  // for server side, redirect traffic if "redirect" is set, otherwise, close connection after a random timeout
  if (__IS_SERVER__) {
    if (__REDIRECT__) {
      const {orgData} = action.payload;
      const [host, port] = __REDIRECT__.split(':');

      logger.warn(`[relay] [${this.remote}] connection is redirecting to: ${host}:${port}`);

      // replace presets to tracker only
      this.setPresets((/* prevPresets */) => [{name: 'tracker'}]);

      // connect to "redirect" remote
      const fsocket = await this.connect({host, port: +port});
      if (fsocket && fsocket.writable) {
        fsocket.write(orgData);
      }
    } else {
      this._bsocket && this._bsocket.pause();
      this._fsocket && this._fsocket.pause();
      const timeout = getRandomInt(10, 40);
      logger.warn(`[relay] [${this.remote}] connection will be closed in ${timeout}s...`);
      setTimeout(this.destroy, timeout * 1e3);
    }
  }
}

function onPresetCloseConnection() {
  logger.info(`[relay] [${this.remote}] preset request to close connection`);
  this.destroy();
}

// traffic control

function onPresetPauseRecv() {
  __IS_SERVER__ ?
    (this._bsocket && this._bsocket.pause()) :
    (this._fsocket && this._fsocket.pause());
}

function onPresetResumeRecv() {
  __IS_SERVER__ ?
    (this._bsocket && this._bsocket.resume()) :
    (this._fsocket && this._fsocket.resume());
}

function onPresetPauseSend() {
  __IS_SERVER__ ?
    (this._fsocket && this._fsocket.pause()) :
    (this._bsocket && this._bsocket.pause());
}

function onPresetResumeSend() {
  __IS_SERVER__ ?
    (this._fsocket && this._fsocket.resume()) :
    (this._bsocket && this._bsocket.resume());
}

export default function ActionHandler(action) {
  const handler = mapping[action.type];
  if (typeof handler === 'function') {
    handler.call(this, action);
  } else {
    logger.warn(`unhandled action type: ${action.type}`);
  }
}
