import dns from 'dns';
import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';
import url from 'url';
import qs from 'qs';
import winston from 'winston';
import isPlainObject from 'lodash.isplainobject';
import {getPresetClassByName, IPresetAddressing} from '../presets';
import {isValidHostname, isValidPort, logger} from '../utils';
import {DNS_DEFAULT_EXPIRE} from './dns-cache';

function loadFileSync(file) {
  return fs.readFileSync(path.resolve(process.cwd(), file));
}

export class Config {

  static init(json) {
    const {protocol, hostname, port, query} = url.parse(json.service);
    global.__LOCAL_PROTOCOL__ = protocol.slice(0, -1);
    global.__LOCAL_HOST__ = hostname;
    global.__LOCAL_PORT__ = +port;

    if (json.servers !== undefined) {
      global.__SERVERS__ = json.servers.filter((server) => !!server.enabled);
      global.__IS_CLIENT__ = true;
      global.__IS_SERVER__ = false;
    } else {
      global.__IS_CLIENT__ = false;
      global.__IS_SERVER__ = true;
    }

    Config.initLogger(json);

    if (__IS_SERVER__) {
      Config.initServer(json);
    }

    if (__IS_CLIENT__ && __LOCAL_PROTOCOL__ === 'tcp') {
      const {forward} = qs.parse(query);
      const {hostname, port} = url.parse('tcp://' + forward);
      global.__FORWARD_HOST__ = hostname;
      global.__FORWARD_PORT__ = +port;
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
  }

  static initServer(server) {
    // service
    const {protocol, hostname, port} = url.parse(server.service);
    global.__TRANSPORT__ = protocol.slice(0, -1);
    global.__SERVER_HOST__ = hostname;
    global.__SERVER_PORT__ = +port;

    // preload tls_cert or tls_key
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

    // mux
    global.__MUX__ = !!server.mux;
    if (__IS_CLIENT__) {
      global.__MUX_CONCURRENCY__ = server.mux_concurrency || 10;
    }

    // remove unnecessary presets
    if (__MUX__) {
      global.__PRESETS__ = __PRESETS__.filter(
        ({name}) => !IPresetAddressing.isPrototypeOf(getPresetClassByName(name))
      );
    }

    // pre-init presets
    for (const {name, params = {}} of server.presets) {
      const clazz = getPresetClassByName(name);
      clazz.checked = false;
      clazz.checkParams(params);
      clazz.initialized = false;
      clazz.onInit(params);
    }
  }

  static initLogger(json) {
    // log_path & log_level
    const absolutePath = path.resolve(process.cwd(), json.log_path || '.');
    let isFile = false;
    if (fs.existsSync(absolutePath)) {
      isFile = fs.statSync(absolutePath).isFile();
    } else if (path.extname(absolutePath) !== '') {
      isFile = true;
    }

    // log_path, log_level, log_max_days
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

  static test(json) {
    if (!isPlainObject(json)) {
      throw Error('invalid configuration file');
    }
    const is_client = !!json.servers;
    if (is_client) {
      Config.testOnClient(json);
    } else {
      Config.testOnServer(json);
    }
  }

  static testOnClient(json) {
    // service
    if (!json.service) {
      throw Error('"service" must be provided as "<protocol>://<host>:<port>[?params]"');
    }

    const {protocol: _protocol, hostname, port, query} = url.parse(json.service);

    // service.protocol
    if (typeof _protocol !== 'string') {
      throw Error('service.protocol is invalid');
    }

    const protocol = _protocol.slice(0, -1);
    const available_client_protocols = [
      'tcp', 'http', 'https',
      'socks', 'socks5', 'socks4', 'socks4a'
    ];
    if (!available_client_protocols.includes(protocol)) {
      throw Error(`service.protocol must be: ${available_client_protocols.join(', ')}`);
    }

    // service.host
    if (!isValidHostname(hostname)) {
      throw Error('service.host is invalid');
    }

    // service.port
    if (!isValidPort(+port)) {
      throw Error('service.port is invalid');
    }

    // service.query
    if (protocol === 'tcp') {
      const {forward} = qs.parse(query);

      // ?forward
      if (!forward) {
        throw Error('require "?forward=<host>:<port>" parameter in service when using "tcp" on client side');
      }

      const {hostname, port} = url.parse('tcp://' + forward);
      if (!isValidHostname(hostname)) {
        throw Error('service.?forward.host is invalid');
      }
      if (!isValidPort(+port)) {
        throw Error('service.?forward.port is invalid');
      }
    }

    // servers
    if (!Array.isArray(json.servers)) {
      throw Error('"servers" must be provided as an array');
    }
    const servers = json.servers.filter((server) => !!server.enabled);
    if (servers.length < 1) {
      throw Error('"servers" must have at least one enabled item');
    }
    servers.forEach((server) => Config._testServer(server, true));

    // common
    Config._testCommon(json);
  }

  static testOnServer(json) {
    // server
    Config._testServer(json, false);

    // redirect
    if (json.redirect !== undefined && json.redirect !== '') {
      if (typeof json.redirect !== 'string') {
        throw Error('"redirect" must be a string');
      }
      const parts = json.redirect.split(':');
      if (parts.length !== 2) {
        throw Error('"redirect" must be "<host or ip>:<port>"');
      }
      const [host, port] = parts;
      if (!isValidHostname(host) && !net.isIP(host)) {
        throw Error('"redirect" host is invalid');
      }
      if (!isValidPort(+port)) {
        throw Error('"redirect" port is invalid');
      }
    }

    // common
    Config._testCommon(json);
  }

  static _testServer(server, from_client) {
    // service
    if (!server.service) {
      throw Error('"service" must be provided as "<protocol>://<host>:<port>[?params]"');
    }

    const {protocol: _protocol, hostname, port} = url.parse(server.service);

    // service.protocol
    if (typeof _protocol !== 'string') {
      throw Error('service.protocol is invalid');
    }

    const protocol = _protocol.slice(0, -1);
    const available_server_protocols = [
      'tcp', 'ws', 'tls'
    ];
    if (!available_server_protocols.includes(protocol)) {
      throw Error(`service.protocol must be: ${available_server_protocols.join(', ')}`);
    }

    // tls_cert, tls_key
    if (protocol === 'tls') {
      if (typeof server.tls_cert !== 'string' || server.tls_cert === '') {
        throw Error('"tls_cert" must be provided');
      }
      if (!from_client) {
        if (typeof server.tls_key !== 'string' || server.tls_key === '') {
          throw Error('"tls_key" must be provided');
        }
      }
    }

    // service.host
    if (!isValidHostname(hostname)) {
      throw Error('service.host is invalid');
    }

    // service.port
    if (!isValidPort(+port)) {
      throw Error('service.port is invalid');
    }

    // key
    if (typeof server.key !== 'string' || server.key === '') {
      throw Error('"server.key" must be a non-empty string');
    }

    // mux
    if (server.mux !== undefined) {
      if (typeof server.mux !== 'boolean') {
        throw Error('"server.mux" must be true or false');
      }
      if (from_client && server.mux_concurrency !== undefined) {
        if (typeof server.mux_concurrency !== 'number' || server.mux_concurrency < 1) {
          throw Error('"server.mux_concurrency" must be a number and greater than 0');
        }
      }
    }

    // presets
    if (!Array.isArray(server.presets)) {
      throw Error('"server.presets" must be an array');
    }

    if (server.presets.length < 1) {
      throw Error('"server.presets" must contain at least one preset');
    }

    // presets[].parameters
    for (const preset of server.presets) {
      const {name, params} = preset;
      if (typeof name !== 'string') {
        throw Error('"server.presets[].name" must be a string');
      }
      if (name === '') {
        throw Error('"server.presets[].name" cannot be empty');
      }
      if (params !== undefined) {
        if (!isPlainObject(params)) {
          throw Error('"server.presets[].params" must be an plain object');
        }
      }
    }
  }

  static _testCommon(common) {
    // timeout
    if (common.timeout !== undefined) {
      const {timeout} = common;
      if (typeof timeout !== 'number') {
        throw Error('"timeout" must be a number');
      }
      if (timeout < 1) {
        throw Error('"timeout" must be greater than 0');
      }
      if (timeout < 60) {
        console.warn(`[config] "timeout" is too short, is ${timeout}s expected?`);
      }
    }

    // log_path
    if (common.log_path !== undefined) {
      if (typeof common.log_path !== 'string') {
        throw Error('"log_path" must be a string');
      }
    }

    // log_level
    if (common.log_level !== undefined) {
      const levels = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];
      if (!levels.includes(common.log_level)) {
        throw Error(`"log_level" must be one of [${levels}]`);
      }
    }

    // log_max_days
    if (common.log_max_days !== undefined) {
      const {log_max_days} = common;
      if (typeof log_max_days !== 'number') {
        throw Error('"log_max_days" must a number');
      }
      if (log_max_days < 1) {
        throw Error('"log_max_days" must be greater than 0');
      }
    }

    // workers
    if (common.workers !== undefined) {
      const {workers} = common;
      if (typeof workers !== 'number') {
        throw Error('"workers" must be a number');
      }
      if (workers < 0) {
        throw Error('"workers" must be an integer');
      }
      if (workers > os.cpus().length) {
        console.warn(`[config] "workers" is greater than the number of CPUs, is ${workers} workers expected?`);
      }
    }

    // dns
    if (common.dns !== undefined) {
      const {dns} = common;
      if (!Array.isArray(dns)) {
        throw Error('"dns" must be an array');
      }
      for (const ip of dns) {
        if (!net.isIP(ip)) {
          throw Error(`"${ip}" is not an ip address`);
        }
      }
    }

    // dns_expire
    if (common.dns_expire !== undefined) {
      const {dns_expire} = common;
      if (typeof dns_expire !== 'number') {
        throw Error('"dns_expire" must be a number');
      }
      if (dns_expire < 0) {
        throw Error('"dns_expire" must be greater or equal to 0');
      }
      if (dns_expire > 24 * 60 * 60) {
        console.warn(`[config] "dns_expire" is too long, is ${dns_expire}s expected?`);
      }
    }
  }

}
