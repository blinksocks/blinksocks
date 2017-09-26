import dns from 'dns';
import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';
import winston from 'winston';
import isPlainObject from 'lodash.isplainobject';
import {getPresetClassByName} from '../presets';
import {isValidHostname, isValidPort, logger} from '../utils';
import {DNS_DEFAULT_EXPIRE} from './dns-cache';

export class Config {

  static init(json) {
    this._validate(json);

    global.__LOCAL_HOST__ = json.host;
    global.__LOCAL_PORT__ = json.port;

    if (json.servers !== undefined) {
      global.__SERVERS__ = json.servers.filter((server) => server.enabled);
      global.__IS_CLIENT__ = true;
      global.__IS_SERVER__ = false;
    } else {
      global.__IS_CLIENT__ = false;
      global.__IS_SERVER__ = true;
      this.initServer(json);
    }

    global.__TIMEOUT__ = (json.timeout !== undefined) ? json.timeout * 1e3 : 600 * 1e3;
    global.__REDIRECT__ = (json.redirect !== '') ? json.redirect : null;
    global.__WORKERS__ = (json.workers !== undefined) ? json.workers : 0;
    global.__DNS_EXPIRE__ = (json.dns_expire !== undefined) ? json.dns_expire * 1e3 : DNS_DEFAULT_EXPIRE;
    global.__ALL_CONFIG__ = json;

    // dns
    if (json.dns !== undefined && json.dns.length > 0) {
      global.__DNS__ = json.dns;
      dns.setServers(json.dns);
    }

    // log_path & log_level
    const absolutePath = path.resolve(process.cwd(), json.log_path || '.');
    let isFile = false;
    if (fs.existsSync(absolutePath)) {
      isFile = fs.statSync(absolutePath).isFile();
    } else if (path.extname(absolutePath) !== '') {
      isFile = true;
    }

    // logger stuff
    global.__LOG_PATH__ = isFile ? absolutePath : path.join(absolutePath, `bs-${__IS_CLIENT__ ? 'client' : 'server'}.log`);
    global.__LOG_LEVEL__ = (json.log_level !== undefined) ? json.log_level : 'info';
    global.__LOG_MAX_DAYS__ = (json.log_max_days !== undefined) ? json.log_max_days : 0;

    logger.configure({
      level: __LOG_LEVEL__,
      transports: [
        new (winston.transports.Console)({
          colorize: true,
          prettyPrint: true
        }),
        new (require('winston-daily-rotate-file'))({
          filename: __LOG_PATH__,
          level: __LOG_LEVEL__,
          maxDays: __LOG_MAX_DAYS__
        })
      ]
    });
  }

  static initServer(server) {
    global.__TRANSPORT__ = (server.transport !== undefined) ? server.transport : 'tcp';
    if (__TRANSPORT__ === 'tls') {
      global.__TLS_CERT__ = fs.readFileSync(path.resolve(process.cwd(), server.tls_cert));
      if (__IS_SERVER__) {
        global.__TLS_KEY__ = fs.readFileSync(path.resolve(process.cwd(), server.tls_key));
      }
    }
    global.__SERVER_HOST__ = server.host;
    global.__SERVER_PORT__ = server.port;
    global.__KEY__ = server.key;
    global.__PRESETS__ = server.presets;
  }

  static _validate(json) {
    if (!isPlainObject(json)) {
      throw Error('invalid configuration file');
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
      servers.forEach(this._validateServer);
    } else {
      this._validateServer(json);
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

    if (json.redirect !== undefined && json.redirect !== '') {
      if (typeof json.redirect !== 'string') {
        throw Error('\'redirect\' must be a string');
      }
      const parts = json.redirect.split(':');
      if (parts.length !== 2) {
        throw Error('\'redirect\' must be "<host or ip>:<port>"');
      }
      const [host, port] = parts;
      if (!isValidHostname(host) && !net.isIP(host)) {
        throw Error('\'redirect\' host is invalid');
      }
      if (!isValidPort(+port)) {
        throw Error('\'redirect\' port is invalid');
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

    // log_max_days
    if (json.log_max_days !== undefined) {
      if (typeof json.log_max_days !== 'number') {
        throw Error('\'log_max_days\' must a number');
      }
      if (json.log_max_days < 1) {
        throw Error('\'log_max_days\' must be greater than 0');
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

  static _validateServer(server) {
    // transport
    if (server.transport !== undefined) {
      if (!['tcp', 'tls', 'websocket'].includes(server.transport)) {
        throw Error('\'server.transport\' must be "tcp", "tls" or "websocket"');
      }
      if (server.transport === 'tls') {
        if (typeof server.tls_cert !== 'string') {
          throw Error('\'server.tls_key\' must be a string');
        }
        if (server.tls_cert === '') {
          throw Error('\'server.tls_cert\' cannot be empty');
        }
      }
    }

    // host
    if (!isValidHostname(server.host)) {
      throw Error('\'server.host\' is invalid');
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
      if (typeof name !== 'string') {
        throw Error('\'server.presets[].name\' must be a string');
      }
      if (name === '') {
        throw Error('\'server.presets[].name\' cannot be empty');
      }
      if (params !== undefined) {
        if (!isPlainObject(params)) {
          throw Error('\'server.presets[].params\' must be an plain object');
        }
      }
      // check for existence of the preset
      const PresetClass = getPresetClassByName(preset.name);
      PresetClass.checkParams(preset.params || {});
    }
  }

}
