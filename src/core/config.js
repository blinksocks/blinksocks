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
import {DNSCache, isValidHostname, isValidPort, logger, DNS_DEFAULT_EXPIRE} from '../utils';

function loadFileSync(file) {
  return fs.readFileSync(path.resolve(process.cwd(), file));
}

export class Config {

  local_protocol = null;
  local_host = null;
  local_port = null;

  forward_host = null;
  forward_port = null;

  servers = null;
  is_client = null;
  is_server = null;

  timeout = null;
  redirect = null;
  workers = null;

  dns_expire = null;
  dns = null;

  transport = null;
  server_host = null;
  server_port = null;
  tls_cert = null;
  tls_key = null;
  key = null;

  presets = null;
  udp_presets = null;

  mux = null;
  mux_concurrency = null;

  log_path = null;
  log_level = null;
  log_max_days = null;

  // an isolate space where presets can store something in.
  // store[i] is for presets[i]
  stores = [];

  constructor(json) {
    const {protocol, hostname, port, query} = url.parse(json.service);
    this.local_protocol = protocol.slice(0, -1);
    this.local_host = hostname;
    this.local_port = +port;

    if (json.servers !== undefined) {
      this.servers = json.servers.filter((server) => !!server.enabled);
      this.is_client = true;
      this.is_server = false;
    } else {
      this.is_client = false;
      this.is_server = true;
    }

    this._initLogger(json);

    if (this.is_server) {
      this.initServer(json);
    }

    if (this.is_client && this.local_protocol === 'tcp') {
      const {forward} = qs.parse(query);
      const {hostname, port} = url.parse('tcp://' + forward);
      this.forward_host = hostname;
      this.forward_port = +port;
    }

    this.timeout = (json.timeout !== undefined) ? json.timeout * 1e3 : 600 * 1e3;
    this.redirect = (json.redirect !== '') ? json.redirect : null;
    this.workers = (json.workers !== undefined) ? json.workers : 0;
    this.dns_expire = (json.dns_expire !== undefined) ? json.dns_expire * 1e3 : DNS_DEFAULT_EXPIRE;

    // dns
    if (json.dns !== undefined && json.dns.length > 0) {
      this.dns = json.dns;
      dns.setServers(json.dns);
    }

    // dns-cache
    DNSCache.init(this.dns_expire);
  }

  initServer(server) {
    // service
    const {protocol, hostname, port} = url.parse(server.service);
    this.transport = protocol.slice(0, -1);
    this.server_host = hostname;
    this.server_port = +port;

    // preload tls_cert or tls_key
    if (this.transport === 'tls') {
      logger.info(`[config] loading ${server.tls_cert}`);
      this.tls_cert = loadFileSync(server.tls_cert);
      if (this.is_server) {
        logger.info(`[config] loading ${server.tls_key}`);
        this.tls_key = loadFileSync(server.tls_key);
      }
    }

    this.key = server.key;
    this.presets = server.presets;
    this.udp_presets = server.presets;

    // mux
    this.mux = !!server.mux;
    if (this.is_client) {
      this.mux_concurrency = server.mux_concurrency || 10;
    }

    // remove unnecessary presets
    if (this.mux) {
      this.presets = this.presets.filter(
        ({name}) => !IPresetAddressing.isPrototypeOf(getPresetClassByName(name))
      );
    }

    // pre-cache presets
    this.stores = (new Array(this.presets.length)).fill({});
    for (let i = 0; i < server.presets.length; i++) {
      const {name, params = {}} = server.presets[i];
      const clazz = getPresetClassByName(name);
      const data = clazz.onCache(params);
      if (data instanceof Promise) {
        data.then((d) => this.stores[i] = d);
      } else {
        this.stores[i] = clazz.onCache(params);
      }
    }
  }

  _initLogger(json) {
    // log_path & log_level
    const absolutePath = path.resolve(process.cwd(), json.log_path || '.');
    let isFile = false;
    if (fs.existsSync(absolutePath)) {
      isFile = fs.statSync(absolutePath).isFile();
    } else if (path.extname(absolutePath) !== '') {
      isFile = true;
    }

    // log_path, log_level, log_max_days
    this.log_path = isFile ? absolutePath : path.join(absolutePath, `bs-${this.is_client ? 'client' : 'server'}.log`);
    this.log_level = (json.log_level !== undefined) ? json.log_level : 'info';
    this.log_max_days = (json.log_max_days !== undefined) ? json.log_max_days : 0;

    logger.configure({
      level: this.log_level,
      transports: [
        new (winston.transports.Console)({
          colorize: true,
          prettyPrint: true
        }),
        new (require('winston-daily-rotate-file'))({
          json: false,
          eol: os.EOL,
          filename: this.log_path,
          level: this.log_level,
          maxDays: this.log_max_days
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
        const clazz = getPresetClassByName(name);
        clazz.onCheckParams(params);
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
