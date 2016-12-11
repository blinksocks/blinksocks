import fs from 'fs';
import log4js from 'log4js';
import {Crypto} from '../Crypto';

export const DEFAULT_CIPHER = 'aes-256-cfb';
export const DEFAULT_KEY = 'my secret password';
export const DEFAULT_LOG_LEVEL = 'ERROR';

export class Config {

  static host;

  static port;

  static server_host;

  static server_port;

  static key;

  static cipher;

  static use_iv;

  static log_level;

  static isServer = true;

  static init(json) {
    if (typeof json !== 'object' || Array.isArray(json)) {
      throw Error('Invalid configuration file');
    }

    if (typeof json.host !== 'string' || json.host === '') {
      throw Error('\'host\' must be provided and is not empty');
    }

    if (!Number.isSafeInteger(json.port) || json.port <= 0) {
      throw Error('\'port\' must be a natural number');
    }

    if (typeof json.server_host === 'string') {
      if (json.server_host === '') {
        throw Error('\'server_host\' must not be empty');
      }

      if (!Number.isSafeInteger(json.server_port) || json.server_port <= 0) {
        throw Error('\'server_port\' must be a natural number');
      }
      Config.isServer = false;
    }

    if (typeof json.password !== 'string') {
      throw Error('\'password\' must be a string and is not empty');
    }

    if (typeof json.cipher !== 'string') {
      throw Error('\'cipher\' must be a string');
    }

    if (json.cipher !== '') {
      if (!Crypto.isAvailable(json.cipher)) {
        throw Error('\'cipher\' is not supported, use --ciphers to display all supported ciphers');
      }
      if (typeof json.use_iv !== 'boolean') {
        throw Error('\'use_iv\' must be true or false');
      }
      if (json.password === '' || json.password === DEFAULT_KEY) {
        throw Error(`\'password\' must not be empty or \'${DEFAULT_KEY}\'`);
      }
      this.cipher = Config.obtainCipher(json.cipher);
      this.key = this.getKey(this.cipher, json.password);
      this.use_iv = json.use_iv;
    } else {
      this.cipher = '';
      this.key = '';
      this.use_iv = false;
      console.warn('you haven\'t specify a cipher, this shall only be used in development or special cases.');
    }

    this.host = json.host;
    this.port = json.port;
    this.server_host = json.server_host;
    this.server_port = json.server_port;
    this.log_level = this.setUpLogger(json.log_level || DEFAULT_LOG_LEVEL);
  }

  /**
   * generate key from config.password
   */
  static getKey(cipher, password) {
    const keyLen = Crypto.getKeySize(cipher);
    return Crypto.hash(Crypto.hash(password)).substr(0, keyLen);
  }

  /**
   * check if crypto module is available
   * @returns {boolean}
   */
  static obtainCipher(tryCipher) {
    let cipher = tryCipher;
    try {
      const crypto = require('crypto');
      crypto.createCipher(cipher, '');
    } catch (err) {
      if (err.message.indexOf('cipher') !== -1) {
        console.warn(`unsupported cipher: '${cipher}', fallback to: '${DEFAULT_CIPHER}'`);
        cipher = DEFAULT_CIPHER;
      } else {
        console.error('crypto module is unavailable, please re-build your Node.js with [crypto] module.');
        process.exit(-1);
      }
    }
    return cipher;
  }

  /**
   * configure log4js
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

    // determine log level of log4js
    let _level = level.toUpperCase();
    switch (_level) {
      case 'OFF':
      case 'FATAL':
      case 'ERROR':
      case 'WARN':
      case 'INFO':
      case 'DEBUG':
      case 'TRACE':
      case 'ALL':
        break;
      default:
        _level = DEFAULT_LOG_LEVEL;
        break;
    }

    // configure log4js globally
    log4js.configure({
      appenders: [{
        type: 'console'
      }, {
        type: 'dateFile',
        filename: 'logs/blinksocks.log',
        pattern: '-yyyy-MM-dd'
      }]
    });

    return _level;
  }

}
