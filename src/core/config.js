import fs from 'fs';
import {isValidPort} from 'blinksocks-utils';
import {BLINKSOCKS_DIR, LOG_DIR, DEFAULT_LOG_LEVEL} from './constants';

/**
 * make directory if not exist
 * @param dir
 */
function mkdir(dir) {
  try {
    fs.lstatSync(dir);
  } catch (err) {
    if (err.code === 'ENOENT') {
      fs.mkdirSync(dir);
    }
  }
}

// create ~/.blinksocks directory
mkdir(BLINKSOCKS_DIR);

// create ~/.blinksocks/logs directory
mkdir(LOG_DIR);

export class Config {

  static validate(json) {
    if (typeof json !== 'object' || Array.isArray(json)) {
      throw Error('Invalid configuration file');
    }

    // host
    if (typeof json.host !== 'string' || json.host === '') {
      throw Error('\'host\' must be provided and is not empty');
    }

    // port
    if (!isValidPort(json.port)) {
      throw Error('\'port\' is invalid');
    }

    // servers
    if (typeof json.servers !== 'undefined') {

      if (!Array.isArray(json.servers)) {
        throw Error('\'servers\' must be provided as an array');
      }

      const servers = json.servers.filter((server) => server.enabled === true);

      if (servers.length < 1) {
        throw Error('\'servers\' must have at least one enabled item');
      }

      servers.forEach(this.validateServer);

    } else {
      this.validateServer(json);
    }

    // redirect
    if (typeof json.redirect === 'string' && json.redirect !== '') {
      const address = json.redirect.split(':');
      if (address.length !== 2 || !isValidPort(+address[1])) {
        throw Error('\'redirect\' is an invalid address');
      }
    }

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
  }

  static validateServer(server) {
    // transport
    if (typeof server.transport !== 'string') {
      throw Error('\'server.transport\' must be a string');
    }

    if (!['tcp', 'udp'].includes(server.transport.toLowerCase())) {
      throw Error('\'server.transport\' must be one of "tcp" or "udp"');
    }

    // host
    if (typeof server.host !== 'string' || server.host === '') {
      throw Error('\'server.host\' must be provided and is not empty');
    }

    // port
    if (!isValidPort(server.port)) {
      throw Error('\'server.port\' is invalid');
    }

    // key
    if (typeof server.key !== 'string') {
      throw Error('\'server.key\' must be a string');
    }

    if (server.key === '') {
      throw Error('\'server.key\' cannot be empty');
    }

    // presets
    if (!Array.isArray(server.presets)) {
      throw Error('\'server.presets\' must be an array');
    }

    if (server.presets.length < 1) {
      throw Error('\'server.presets\' must contain at least one preset');
    }

    // presets[].parameters
    for (const preset of server.presets) {
      const {name, params} = preset;

      if (typeof name === 'undefined') {
        throw Error('\'server.presets[].name\' must be a string');
      }

      if (name === '') {
        throw Error('\'server.presets[].name\' cannot be empty');
      }

      if (typeof params !== 'object' || params === null) {
        throw Error('\'server.presets[].params\' must be an object and not null');
      }

      // 1. check for the existence of the preset
      const ps = require(`../presets/${preset.name}`).default;

      // 2. check parameters, but ignore the first preset
      if (name !== server.presets[0].name) {
        delete new ps(params || {});
      }
    }
  }

  static init(json) {
    this.validate(json);

    global.__LOCAL_HOST__ = json.host;
    global.__LOCAL_PORT__ = json.port;

    if (typeof json.servers !== 'undefined') {
      global.__SERVERS__ = json.servers.filter((server) => server.enabled);
      global.__IS_CLIENT__ = true;
    } else {
      global.__IS_CLIENT__ = false;
      this.initServer(json);
    }

    global.__IS_SERVER__ = !global.__IS_CLIENT__;
    global.__REDIRECT__ = json.redirect;
    global.__TIMEOUT__ = json.timeout;
    global.__PROFILE__ = !!json.profile;
    global.__IS_WATCH__ = !!json.watch;
    global.__LOG_LEVEL__ = this.getLogLevel(json.log_level);
    global.__ALL_CONFIG__ = json;

  }

  static initServer(server) {
    this.validateServer(server);

    global.__TRANSPORT__ = server.transport;
    global.__SERVER_HOST__ = server.host;
    global.__SERVER_PORT__ = server.port;
    global.__KEY__ = server.key;
    global.__PRESETS__ = server.presets;
  }

  static getLogLevel(level = DEFAULT_LOG_LEVEL) {
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
    return _level;
  }

}
