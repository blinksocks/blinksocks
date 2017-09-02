/* eslint-disable no-unused-vars */

// - pushed by relay

/**
 *  {
 *    type: PRESET_INIT,
 *    payload: {
 *      broadcast: (action) => {}
 *    }
 *  }
 */
export const PRESET_INIT = '@action:preset_init';

/**
 *  {
 *    type: CONNECTION_CREATED,
 *    payload: {
 *      host: '127.0.0.1',
 *      port: 12345
 *    }
 *  }
 */
export const CONNECTION_CREATED = 'connection/created';

/**
 *  {
 *    type: CONNECTION_CLOSED
 *    payload: {
 *      host: '127.0.0.1',
 *      port: 12345
 *    }
 *  }
 */
export const CONNECTION_CLOSED = 'connection/closed';

// - emitted by presets

/**
 *  {
 *    type: CONNECT_TO_REMOTE,
 *    payload: {
 *      host: 'bing.com',
 *      port: 443,
 *      onConnected: () => {}
 *    }
 *  }
 */
export const CONNECT_TO_REMOTE = 'connect/to/remote';

/**
 *  {
 *    type: PRESET_FAILED,
 *    payload: {
 *      name: 'custom' or null,
 *      message: 'explain',
 *      orgData: <Buffer> or null
 *    }
 *  }
 */
export const PRESET_FAILED = 'preset/failed';

/**
 *  {
 *    type: PRESET_CLOSE_CONNECTION
 *  }
 */
export const PRESET_CLOSE_CONNECTION = 'preset/close/connection';

export class IPreset {

  /**
   * check params passed to the preset, if any errors, should throw directly
   */
  static checkParams(params) {

  }

  // callbacks

  /**
   * how to handle the action, return false/undefined to continue delivery
   * @returns {boolean}
   */
  onNotified(action) {
    return false;
  }

  /**
   * you can do something when preset destroyed
   */
  onDestroy() {

  }

  // life cycle hooks

  beforeOut({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  beforeIn({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  clientOut({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  serverIn({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  serverOut({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  clientIn({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  // auto-generated methods for convenience, DO NOT implement them!

  broadcast(action) {

  }

  fail(message) {

  }

}

export class IPresetStatic extends IPreset {

  static isInstantiated = false;

  constructor() {
    super();
    if (IPresetStatic.isInstantiated) {
      throw Error(`${this.constructor.name} is singleton and can only be instantiated once`);
    }
    IPresetStatic.isInstantiated = true;
  }

}
