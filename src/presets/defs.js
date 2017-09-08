/* eslint-disable no-unused-vars */

// - pushed by relay

/**
 *  {
 *    type: CONNECTION_CREATED,
 *    payload: {
 *      host: '127.0.0.1',
 *      port: 12345
 *    }
 *  }
 */
export const CONNECTION_CREATED = '@action:connection_created';

/**
 *  {
 *    type: CONNECTION_CLOSED
 *    payload: {
 *      host: '127.0.0.1',
 *      port: 12345
 *    }
 *  }
 */
export const CONNECTION_CLOSED = '@action:connection_closed';

/**
 *  {
 *    type: CONNECTION_WILL_CLOSE
 *    payload: {
 *      host: '127.0.0.1',
 *      port: 12345
 *    }
 *  }
 */
export const CONNECTION_WILL_CLOSE = '@action:connection_will_close';

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
export const CONNECT_TO_REMOTE = '@action:connect_to_remote';

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
export const PRESET_FAILED = '@action:preset_failed';

export const PRESET_CLOSE_CONNECTION = '@action:preset_close_connection';

export const PRESET_PAUSE_RECV = '@action:preset_pause_recv';
export const PRESET_PAUSE_SEND = '@action:preset_pause_send';
export const PRESET_RESUME_RECV = '@action:preset_resume_recv';
export const PRESET_RESUME_SEND = '@action:preset_resume_send';

/**
 *
 * @lifecycle
 *   [static checkParams() -> static onInit()] -> constructor() -> ... -> onDestroy()
 *                Only call once
 */
export class IPreset {

  /**
   * check params passed to the preset, if any errors, should throw directly
   * @param params
   */
  static checkParams(params) {

  }

  /**
   * you can make some cache in this function
   * @param params
   */
  static onInit(params) {

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

  next(direction, buffer) {

  }

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
