import dns from 'dns';
import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';
import url from 'url';
import winston from 'winston';
import isPlainObject from 'lodash.isplainobject';
import {getPresetClassByName} from '../presets';
import {isValidHostname, isValidPort, logger} from '../utils';
import {DNS_DEFAULT_EXPIRE} from './dns-cache';

function loadFileSync(file) {
  return fs.readFileSync(path.resolve(process.cwd(), file));
}

export class Config {

  static init(json) {
    this._validate(json);

    if (json.servers !== undefined) {
      global.__SERVERS__ = json.servers.filter((server) => server.enabled);
      global.__IS_CLIENT__ = true;
      global.__IS_SERVER__ = false;
    } else {
      global.__IS_CLIENT__ = false;
      global.__IS_SERVER__ = true;
      this.initServer(json);
    }

    if (json.service !== undefined) {
      const {protocol, hostname: host, port} = url.parse(json.service);
      global.__LOCAL_PROTOCOL__ = protocol.slice(0, -1);
      global.__LOCAL_HOST__ = host;
      global.__LOCAL_PORT__ = +port;
    } else {
      global.__LOCAL_PROTOCOL__ = __IS_CLIENT__ ? 'socks5' : __TRANSPORT__;
      global.__LOCAL_HOST__ = json.host;
      global.__LOCAL_PORT__ = json.port;
    }

    if (json.dstaddr !== undefined) {
      global.__DSTADDR__ = json.dstaddr;
    }

    if (__IS_CLIENT__ && __LOCAL_PROTOCOL__ === 'tcp' && global.__DSTADDR__ === undefined) {
      throw Error('"dstaddr" must be set on client side if use "tcp://" protocol');
    }

    global.__TIMEOUT__ = (json.timeout !== undefined) ? json.timeout * 1e3 : 600 * 1e3;
    global.__REDIRECT__ = (json.redirect !== '') ? json.redirect : null;
    global.__WORKERS__ = (json.workers !== undefined) ? json.workers : 0;
    global.__DNS_EXPIRE__ = (json.dns_expire !== undefined) ? json.dns_expire * 1e3 : DNS_DEFAULT_EXPIRE;

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
          json: false,
          eol: os.EOL,
          filename: __LOG_PATH__,
          level: __LOG_LEVEL__,
          maxDays: __LOG_MAX_DAYS__
        })
      ]
    });
  }

  static initServer(server) {
    // service
    if (server.service !== undefined) {
      const {protocol, hostname: host, port} = url.parse(server.service);
      global.__TRANSPORT__ = protocol.slice(0, -1);
      global.__SERVER_HOST__ = host;
      global.__SERVER_PORT__ = +port;
    } else {
      global.__TRANSPORT__ = server.transport || 'tcp';
      global.__SERVER_HOST__ = server.host;
      global.__SERVER_PORT__ = server.port;
    }

    // preload tls cert or tls key
    if (__TRANSPORT__ === 'tls') {
      logger.info(`[config] loading ${server.tls_cert}`);
      global.__TLS_CERT__ = loadFileSync(server.tls_cert);
      if (__IS_SERVER__) {
        logger.info(`[config] loading ${server.tls_key}`);
        global.__TLS_KEY__ = loadFileSync(server.tls_key);
      }
    }

    global.__KEY__ = server.key;
    global.__PRESETS__ = server.presets;
  }

  static _validate(json) {
    if (!isPlainObject(json)) {
      throw Error('invalid configuration file');
    }

    // service
    if (json.service !== undefined) {
      Config._validateService(json);
    } else {
      // host
      if (!isValidHostname(json.host)) {
        throw Error('\'host\' is invalid');
      }
      // port
      if (!isValidPort(json.port)) {
        throw Error('\'port\' is invalid');
      }
    }

    // dstaddr
    if (json.dstaddr !== undefined) {
      if (!isPlainObject(json.dstaddr)) {
        throw Error('\'dstaddr\' is invalid');
      }
      const {host, port} = json.dstaddr;
      // host
      if (!isValidHostname(host)) {
        throw Error('\'dstaddr.host\' is invalid');
      }
      // port
      if (!isValidPort(port)) {
        throw Error('\'dstaddr.port\' is invalid');
      }
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
      if (!['tcp', 'tls', 'ws'].includes(server.transport)) {
        throw Error('\'server.transport\' must be "tcp", "tls" or "ws"');
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

    // service
    if (server.service !== undefined) {
      Config._validateService(server);
    } else {
      // host
      if (!isValidHostname(server.host)) {
        throw Error('\'server.host\' is invalid');
      }
      // port
      if (!isValidPort(server.port)) {
        throw Error('\'server.port\' is invalid');
      }
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

  static _validateService(json) {
    const {protocol, hostname: host, port} = url.parse(json.service);
    // protocol
    if (typeof protocol !== 'string') {
      throw Error('service protocol is invalid');
    }
    const AVAILABLE_LOCAL_PROTOCOLS = [
      'tcp', 'socks', 'socks5', 'socks4', 'socks4a',
      'http', 'https', 'ws', 'tls'
    ];
    const _protocol = protocol.slice(0, -1);
    if (!AVAILABLE_LOCAL_PROTOCOLS.includes(_protocol)) {
      throw Error(`service protocol must be: ${AVAILABLE_LOCAL_PROTOCOLS.join(', ')}`);
    }
    if (_protocol === 'tls') {
      if (typeof json.tls_cert !== 'string' || json.tls_cert === '') {
        throw Error('\'tls_cert\' must be set');
      }
      if (json.tls_key !== undefined && typeof json.tls_key !== 'string') {
        throw Error('\'tls_key\' must be set');
      }
    }
    // host
    if (!isValidHostname(host)) {
      throw Error('service host is invalid');
    }
    // port
    if (!isValidPort(+port)) {
      throw Error('service port is invalid');
    }
  }

}
