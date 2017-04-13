import fs from 'fs';
import winston from 'winston';
import {Utils} from '../utils';

export const DEFAULT_KEY = 'my secret password';
export const DEFAULT_LOG_LEVEL = 'error';

export class Config {

  static host;

  static port;

  static servers;

  static key;

  static presets;

  static redirect;

  static log_level;

  static profile;

  static watch;

  static _is_server;

  /**
   * parse config.json
   * @param json
   */
  static init(json) {
    if (typeof json !== 'object' || Array.isArray(json)) {
      throw Error('Invalid configuration file');
    }

    // host

    if (typeof json.host !== 'string' || json.host === '') {
      throw Error('\'host\' must be provided and is not empty');
    }

    this.host = json.host;

    // port

    if (!Utils.isValidPort(json.port)) {
      throw Error('\'port\' is invalid');
    }

    this.port = json.port;

    // servers

    if (typeof json.servers !== 'undefined') {

      if (!Array.isArray(json.servers)) {
        throw Error('\'servers\' must be provided as an array');
      }

      const servers = json.servers
        .map((item) => item.split(':'))
        .filter((pair) => pair.length === 2 && Utils.isValidPort(+pair[1]))
        .map(([host, port]) => ({host, port}));

      if (servers.length < 1) {
        throw Error('\'servers\' must contain at least one valid item');
      }

      this.servers = servers;
      this._is_server = false;
    } else {
      this._is_server = true;
    }

    // key

    if (typeof json.key !== 'string') {
      throw Error('\'key\' must be a string');
    }

    if (json.key === '') {
      throw Error('\'key\' cannot be empty');
    }

    if (json.key === DEFAULT_KEY) {
      throw Error(`'key' cannot be '${DEFAULT_KEY}'`);
    }

    this.key = json.key;

    // presets & presets' parameters

    if (!Array.isArray(json.presets)) {
      throw Error('\'presets\' must be an array');
    }

    if (json.presets.length < 1) {
      throw Error('\'presets\' must contain at least one preset');
    }

    for (const preset of json.presets) {
      const {name, params} = preset;

      if (typeof name === 'undefined') {
        throw Error('\'preset.name\' must be a string');
      }

      // 1. check for the existence of the preset
      const ps = require(`../presets/${preset.name}`).default;

      // 2. check parameters, but ignore the first preset
      if (name !== json.presets[0].name) {
        delete new ps(params || {});
      }
    }

    this.presets = json.presets;

    // redirect

    if (typeof json.redirect === 'string' && json.redirect !== '') {
      const address = json.redirect.split(':');
      if (address.length !== 2 || !Utils.isValidPort(+address[1])) {
        throw Error('\'redirect\' is an invalid address');
      }
    }

    this.redirect = json.redirect;

    // timeout

    if (typeof json.timeout !== 'number') {
      throw Error('\'timeout\' must be a number');
    }

    if (json.timeout < 1) {
      throw Error('\'timeout\' must be greater than 0');
    }

    if (json.timeout < 60) {
      console.warn(`==> [config] 'timeout' is too short, is ${json.timeout}s expected?`);
    }

    this.timeout = json.timeout;

    // profile
    this.profile = json.profile;

    // watch
    this.watch = json.watch;

    // globals
    this.setGlobals();

    // log_level
    this.setUpLogger(json.log_level || DEFAULT_LOG_LEVEL);
  }

  /**
   * make global constants
   */
  static setGlobals() {
    global.__IS_SERVER__ = this._is_server;
    global.__IS_CLIENT__ = !this._is_server;

    global.__LOCAL_HOST__ = this.host;
    global.__LOCAL_PORT__ = this.port;

    global.__SERVERS__ = this.servers;

    global.__KEY__ = this.key;

    global.__PRESETS__ = this.presets;

    global.__REDIRECT__ = this.redirect;
    global.__TIMEOUT__ = this.timeout;

    global.__LOG_LEVEL__ = this.log_level;
    global.__PROFILE__ = this.profile;
    global.__IS_WATCH__ = this.watch;
  }

  /**
   * configure logger
   * @param level
   */
  static setUpLogger(level = '') {
    // create logs directory
    try {
      fs.lstatSync('logs');
    } catch (err) {
      if (err.code === 'ENOENT') {
        fs.mkdirSync('logs');
      }
    }

    // determine log level
    let _level = level.toLowerCase();
    switch (_level) {
      case 'silly':
      case 'debug':
      case 'verbose':
      case 'info':
      case 'warn':
      case 'error':
        break;
      default:
        _level = DEFAULT_LOG_LEVEL;
        break;
    }

    // configure transports
    winston.configure({
      level: _level,
      transports: [
        new (winston.transports.Console)({
          colorize: true,
          prettyPrint: true
        }),
        new (winston.transports.File)({
          filename: `logs/blinksocks-${__IS_CLIENT__ ? 'client' : 'server'}.log`,
          maxsize: 2 * 1024 * 1024, // 2MB
          silent: ['test', 'debug'].includes(process.env.NODE_ENV)
        })
      ]
    });

    this.log_level = _level;
  }

  /**
   * return an object which describe the configuration
   * @returns {{}}
   */
  static abstract() {
    const keys = Object.getOwnPropertyNames(this)
      .filter(
        (key) => ![
          'length', 'name', 'prototype',
          'init', 'setGlobals', 'setUpLogger', 'abstract',
          '_is_server'
        ].includes(key) && this[key] !== undefined
      );
    const json = {};
    for (const key of keys) {
      json[key] = this[key];
    }
    return json;
  }

}
