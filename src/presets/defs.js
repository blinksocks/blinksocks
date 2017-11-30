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
 *      onConnected: () => {},
 *      keepAlive: false
 *    }
 *  }
 */
export const CONNECT_TO_REMOTE = '@action:connect_to_remote';

/**
 *  {
 *    type: CONNECTED_TO_REMOTE,
 *    payload: {
 *      host: 'bing.com',
 *      port: 443
 *    }
 *  }
 */
export const CONNECTED_TO_REMOTE = '@action:connected_to_remote';

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

/**
 *  {
 *    type: CHANGE_PRESET_SUITE,
 *    payload: {
 *      type: <PIPE_ENCODE|PIPE_DECODE>,
 *      suite: [...],
 *      data: <Buffer>
 *    }
 *  }
 */
export const CHANGE_PRESET_SUITE = '@action:change_preset_suite';

export const PRESET_CLOSE_CONNECTION = '@action:preset_close_connection';

export const PRESET_PAUSE_RECV = '@action:preset_pause_recv';
export const PRESET_PAUSE_SEND = '@action:preset_pause_send';
export const PRESET_RESUME_RECV = '@action:preset_resume_recv';
export const PRESET_RESUME_SEND = '@action:preset_resume_send';

export const MUX_FRAME = '@action:mux_frame';

/**
 *
 * @lifecycle
 *   static checkParams() -> static onInit() -> constructor() -> ... -> onDestroy()
 *                          Only called once
 */
export class IPreset {

  /**
   * will become true after checkParams()
   * @type {boolean}
   */
  static checked = false;

  /**
   * will become true after onInit()
   * @type {boolean}
   */
  static initialized = false;

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

  // properties

  /**
   * return the preset name
   * @returns {string}
   */
  getName() {

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

  // hooks for tcp

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

  // hooks for udp

  beforeOutUdp({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  beforeInUdp({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  clientOutUdp({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  serverInUdp({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  serverOutUdp({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  clientInUdp({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  // auto-generated methods for convenience, DO NOT implement them!

  next(direction, buffer) {

  }

  broadcast(action) {

  }

  fail(message) {

  }

  /**
   * direct read any property(match non-static then static) of other preset
   * @param presetName
   * @param propertyName
   */
  readProperty(presetName, propertyName) {

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

/**
 * check if a class is a valid preset class
 * @param clazz
 * @returns {boolean}
 */
export function checkPresetClass(clazz) {
  if (typeof clazz !== 'function') {
    return false;
  }
  // check require hooks
  const requiredMethods = [
    'getName', 'onNotified', 'onDestroy',
    'beforeOut', 'beforeIn', 'clientOut', 'serverIn', 'serverOut', 'clientIn',
    'beforeOutUdp', 'beforeInUdp', 'clientOutUdp', 'serverInUdp', 'serverOutUdp', 'clientInUdp'
  ];
  if (requiredMethods.some((method) => typeof clazz.prototype[method] !== 'function')) {
    return false;
  }
  const requiredStaticMethods = ['checkParams', 'onInit'];
  if (requiredStaticMethods.some((method) => typeof clazz[method] !== 'function')) {
    return false;
  }
  return true;
}
