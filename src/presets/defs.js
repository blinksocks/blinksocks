/* eslint-disable no-unused-vars */

/**
 * @lifecycle
 *   static onCheckParams()
 *   static onCache()
 *   constructor()
 *   onInit()
 *   ...
 *   onDestroy()
 *
 * @note
 *   static onCheckParams() and static onCache() are called only once since new Hub().
 */
export class IPreset {

  /**
   * config
   * @type {Config}
   */
  _config = null;

  /**
   * check params passed to the preset, if any errors, should throw directly
   * @param params
   */
  static onCheckParams(params) {

  }

  /**
   * you can make some cache in store or just return something
   * you want to put in store, then access store later in other
   * hook functions via this.getStore()
   * @param params
   * @param store
   */
  static onCache(params, store) {
    // or return something
  }

  /**
   * constructor
   * @param config
   * @param params
   */
  constructor({ config, params } = {}) {
    if (config) {
      this._config = config;
    }
  }

  /**
   * constructor alternative to do initialization
   * @param params
   */
  onInit(params) {

  }

  /**
   * you can do something when preset destroyed
   */
  onDestroy() {

  }

  // hooks for tcp

  beforeOut({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  beforeIn({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  clientOut({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  serverIn({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  serverOut({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  clientIn({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  // hooks for udp

  beforeOutUdp({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  beforeInUdp({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  clientOutUdp({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  serverInUdp({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  serverOutUdp({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  clientInUdp({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  // auto-generated methods, DO NOT implement them!

  next(direction, buffer) {

  }

  /**
   * direct read any property(match non-static then static) of other preset
   * @param presetName
   * @param propertyName
   */
  readProperty(presetName, propertyName) {

  }

  /**
   * return store passed to onCache()
   */
  getStore() {

  }

}

/**
 * a class which handle addressing
 */
export class IPresetAddressing extends IPreset {

  /**
   * triggered once target address resolved on client side
   * @param host
   * @param port
   */
  onInitTargetAddress({ host, port }) {

  }

  /**
   * DO NOT overwrite it!
   * call it when target address was resolved on server side,
   * @param host
   * @param port
   * @param callback
   */
  resolveTargetAddress({ host, port }, callback) {

  }

}
