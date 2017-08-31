/* eslint-disable no-unused-vars */

// actions may be received by built-in presets in onNotified(action):

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

/**
 *  {
 *    type: PRESET_INIT,
 *    payload: {
 *      broadcast: (action) => {}
 *    }
 *  }
 */
export const PRESET_INIT = 'preset/init';

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

export class IPreset {

  /**
   * check params for the preset, should throw errors directly inside
   */
  static checkParams(params) {

  }

  /**
   * how to deal with the action, return false/undefined to ignore/continue broadcast
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

  // hooks

  beforeOut({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  beforeIn({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  // the following interfaces must be implemented

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
