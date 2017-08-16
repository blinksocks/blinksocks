import dns from 'dns';
import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';
import {isValidPort} from '../utils';
import {DNS_DEFAULT_EXPIRE} from './dns-cache';

export const DEFAULT_LOG_LEVEL = 'info';

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
    if (json.servers !== undefined) {

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
    if (json.redirect !== undefined) {
      if (typeof json.redirect !== 'string') {
        throw Error('\'redirect\' is must be a string');
      }
      const address = json.redirect.split(':');
      if (address.length !== 2 || !isValidPort(+address[1])) {
        throw Error('\'redirect\' must be formed as [host:port]');
      }
    }

    // timeout
    if (json.timeout !== undefined) {
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

    // log_path
    if (json.log_path !== undefined) {
      if (typeof json.log_path !== 'string') {
        throw Error('\'log_path\' must be a string');
      }
    }

    // log_level
    if (json.log_level !== undefined) {
      const levels = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];
      if (!levels.includes(json.log_level)) {
        throw Error(`'log_level' must be one of [${levels.toString()}]`);
      }
    }

    // workers
    if (json.workers !== undefined) {
      if (typeof json.workers !== 'number') {
        throw Error('\'workers\' must be a number');
      }
      if (json.workers < 0) {
        throw Error('\'workers\' must be an integer');
      }
      if (json.workers > os.cpus().length) {
        console.warn(`==> [config] 'workers' is greater than the number of cpus, is ${json.workers} workers expected?`);
      }
    }

    // dns
    if (json.dns !== undefined) {
      if (!Array.isArray(json.dns)) {
        throw Error('\'dns\' must be an array');
      }
      for (const ip of json.dns) {
        if (!net.isIP(ip)) {
          throw Error(`"${ip}" is not an ip address`);
        }
      }
    }

    // dns_expire
    if (json.dns_expire !== undefined) {
      if (typeof json.dns_expire !== 'number') {
        throw Error('\'dns_expire\' must be a number');
      }
      if (json.dns_expire < 0) {
        throw Error('\'dns_expire\' must be greater or equal to 0');
      }
      if (json.dns_expire > 24 * 60 * 60) {
        console.warn(`==> [config] 'dns_expire' is too long, is ${json.dns_expire}s expected?`);
      }
    }
  }

  static validateServer(server) {
    // transport
    if (server.transport !== undefined) {
      if (typeof server.transport !== 'string') {
        throw Error('\'server.transport\' must be a string');
      }
      if (!['tcp', 'udp'].includes(server.transport.toLowerCase())) {
        throw Error('\'server.transport\' must be one of "tcp" or "udp"');
      }
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
    if (typeof server.key !== 'string' || server.key === '') {
      throw Error('\'server.key\' must be a non-empty string');
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

      if (name === undefined) {
        throw Error('\'server.presets[].name\' must be a string');
      }

      if (name === '') {
        throw Error('\'server.presets[].name\' cannot be empty');
      }

      if (params !== undefined) {
        if (typeof params !== 'object' || Array.isArray(params) || params === null) {
          throw Error('\'server.presets[].params\' must be an plain object');
        }
      }

      // 1. check for the existence of the preset
      const ps = require(`../presets/${preset.name}`).default;

      // 2. check parameters
      delete new ps(params || {});
    }
  }

  static init(json) {
    this.validate(json);

    global.__LOCAL_HOST__ = json.host;
    global.__LOCAL_PORT__ = json.port;

    if (json.servers !== undefined) {
      global.__SERVERS__ = json.servers.filter((server) => server.enabled);
      global.__IS_CLIENT__ = true;
    } else {
      global.__IS_CLIENT__ = false;
      this.initServer(json);
    }

    global.__IS_SERVER__ = !global.__IS_CLIENT__;
    global.__REDIRECT__ = (json.redirect !== undefined) ? json.redirect : '';
    global.__TIMEOUT__ = (json.timeout !== undefined) ? json.timeout * 1e3 : 600 * 1e3;
    global.__WORKERS__ = (json.workers !== undefined) ? json.workers : 0;

    const absolutePath = path.resolve(process.cwd(), json.log_path || '.');
    const isFile = fs.statSync(absolutePath).isFile();
    global.__LOG_PATH__ = isFile ? absolutePath : path.join(absolutePath, `bs-${__IS_CLIENT__ ? 'client' : 'server'}.log`);
    global.__LOG_LEVEL__ = (json.log_level !== undefined) ? json.log_level : DEFAULT_LOG_LEVEL;
    global.__DNS_EXPIRE__ = (json.dns_expire !== undefined) ? json.dns_expire * 1e3 : DNS_DEFAULT_EXPIRE;
    global.__ALL_CONFIG__ = json;

    if (json.dns !== undefined && json.dns.length > 0) {
      global.__DNS__ = json.dns;
      dns.setServers(json.dns);
    }
  }

  static initServer(server) {
    this.validateServer(server);

    global.__TRANSPORT__ = (server.transport !== undefined) ? server.transport : 'tcp';
    global.__SERVER_HOST__ = server.host;
    global.__SERVER_PORT__ = server.port;
    global.__KEY__ = server.key;
    global.__PRESETS__ = server.presets;
  }

}
