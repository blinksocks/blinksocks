'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Config = undefined;

var _dns = require('dns');

var _dns2 = _interopRequireDefault(_dns);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _qs = require('qs');

var _qs2 = _interopRequireDefault(_qs);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

var _lodash = require('lodash.isplainobject');

var _lodash2 = _interopRequireDefault(_lodash);

var _acl = require('./acl');

var _presets = require('../presets');

var _defs = require('../presets/defs');

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function loadFileSync(file) {
  return _fs2.default.readFileSync(_path2.default.resolve(process.cwd(), file));
}

class Config {

  constructor(json) {
    this.local_protocol = null;
    this.local_host = null;
    this.local_port = null;
    this.forward_host = null;
    this.forward_port = null;
    this.server = null;
    this.is_client = null;
    this.is_server = null;
    this.timeout = null;
    this.redirect = null;
    this.dns_expire = null;
    this.dns = null;
    this.transport = null;
    this.server_host = null;
    this.server_port = null;
    this.tls_cert = null;
    this.tls_key = null;
    this.key = null;
    this.acl = false;
    this.acl_conf = '';
    this.acl_rules = [];
    this.acl_tries = {};
    this.presets = null;
    this.udp_presets = null;
    this.mux = null;
    this.mux_concurrency = null;
    this.log_path = null;
    this.log_level = null;
    this.log_max_days = null;
    this.stores = [];

    const { protocol, hostname, port, query } = _url2.default.parse(json.service);
    this.local_protocol = protocol.slice(0, -1);
    this.local_host = hostname;
    this.local_port = +port;

    let server;

    if (json.servers !== undefined) {
      server = json.servers.find(server => !!server.enabled);
      console.log(_chalk2.default.bgYellowBright('WARN'), '"servers" will be deprecated in the next version,' + ' please configure only one server in "server: {...}",' + ' for migration guide please refer to CHANGELOG.md.');
    } else {
      server = json.server;
    }

    if (server) {
      this.is_client = true;
      this.is_server = false;
    } else {
      this.is_client = false;
      this.is_server = true;
    }

    this._initLogger(json);

    if (this.is_server) {
      this._initServer(json);
    } else {
      this._initServer(server);
    }

    if (this.is_client && this.local_protocol === 'tcp') {
      const { forward } = _qs2.default.parse(query);
      const { hostname, port } = _url2.default.parse('tcp://' + forward);
      this.forward_host = hostname;
      this.forward_port = +port;
    }

    this.timeout = json.timeout !== undefined ? json.timeout * 1e3 : 600 * 1e3;
    this.dns_expire = json.dns_expire !== undefined ? json.dns_expire * 1e3 : _utils.DNS_DEFAULT_EXPIRE;

    if (json.dns !== undefined && json.dns.length > 0) {
      this.dns = json.dns;
      _dns2.default.setServers(json.dns);
    }

    _utils.DNSCache.init(this.dns_expire);
  }

  _initServer(server) {
    const { protocol, hostname, port } = _url2.default.parse(server.service);
    this.transport = protocol.slice(0, -1);
    this.server_host = hostname;
    this.server_port = +port;

    if (this.transport === 'tls') {
      _utils.logger.info(`[config] loading ${server.tls_cert}`);
      this.tls_cert = loadFileSync(server.tls_cert);
      if (this.is_server) {
        _utils.logger.info(`[config] loading ${server.tls_key}`);
        this.tls_key = loadFileSync(server.tls_key);
      }
    }

    this.key = server.key;
    this.presets = server.presets;
    this.udp_presets = server.presets;

    if (server.acl !== undefined) {
      this.acl = server.acl;
    }

    if (server.acl_conf !== undefined && server.acl) {
      this.acl_conf = server.acl_conf;
      _acl.ACL.loadRules(_path2.default.resolve(process.cwd(), server.acl_conf)).then(rules => this.acl_rules = rules);
    }

    if (server.redirect !== undefined) {
      this.redirect = server.redirect;
    }

    this.mux = !!server.mux;
    if (this.is_client) {
      this.mux_concurrency = server.mux_concurrency || 10;
    }

    if (this.mux) {
      this.presets = this.presets.filter(({ name }) => !_defs.IPresetAddressing.isPrototypeOf((0, _presets.getPresetClassByName)(name)));
    }

    this.stores = new Array(this.presets.length).fill({});
    for (let i = 0; i < server.presets.length; i++) {
      const { name, params = {} } = server.presets[i];
      const clazz = (0, _presets.getPresetClassByName)(name);
      const data = clazz.onCache(params, this.stores[i]);
      if (data instanceof Promise) {
        data.then(d => this.stores[i] = d);
      } else if (typeof data !== 'undefined') {
        this.stores[i] = data;
      }
    }
  }

  _initLogger(json) {
    this.log_path = Config.getLogFilePath(json.log_path);
    this.log_level = json.log_level !== undefined ? json.log_level : 'info';
    this.log_max_days = json.log_max_days !== undefined ? json.log_max_days : 0;

    const level = process.env.NODE_ENV === 'test' ? 'error' : this.log_level;
    const transports = [new _winston2.default.transports.Console({
      colorize: true,
      prettyPrint: true
    })];

    if (process.env.NODE_ENV !== 'test') {
      transports.push(new (require('winston-daily-rotate-file'))({
        level: level,

        json: false,
        eol: _os2.default.EOL,
        filename: this.log_path,
        maxDays: this.log_max_days
      }));
    }

    _utils.logger.configure({ level, transports });
  }

  static getLogFilePath(log_path) {
    const absolutePath = _path2.default.resolve(process.cwd(), log_path || '.');
    let isFile = false;
    if (_fs2.default.existsSync(absolutePath)) {
      isFile = _fs2.default.statSync(absolutePath).isFile();
    } else if (_path2.default.extname(absolutePath) !== '') {
      isFile = true;
    }
    return isFile ? absolutePath : _path2.default.join(absolutePath, `bs-${this.is_client ? 'client' : 'server'}.log`);
  }

  static test(json) {
    if (!(0, _lodash2.default)(json)) {
      throw Error('invalid configuration file');
    }

    const is_client = !!json.servers || !!json.server;
    if (is_client) {
      Config.testOnClient(json);
    } else {
      Config.testOnServer(json);
    }
  }

  static testOnClient(json) {
    if (!json.service) {
      throw Error('"service" must be provided as "<protocol>://<host>:<port>[?params]"');
    }

    const { protocol: _protocol, hostname, port, query } = _url2.default.parse(json.service);

    if (typeof _protocol !== 'string') {
      throw Error('service.protocol is invalid');
    }

    const protocol = _protocol.slice(0, -1);
    const available_client_protocols = ['tcp', 'http', 'https', 'socks', 'socks5', 'socks4', 'socks4a'];
    if (!available_client_protocols.includes(protocol)) {
      throw Error(`service.protocol must be: ${available_client_protocols.join(', ')}`);
    }

    if (!(0, _utils.isValidHostname)(hostname)) {
      throw Error('service.host is invalid');
    }

    if (!(0, _utils.isValidPort)(+port)) {
      throw Error('service.port is invalid');
    }

    if (protocol === 'tcp') {
      const { forward } = _qs2.default.parse(query);

      if (!forward) {
        throw Error('require "?forward=<host>:<port>" parameter in service when using "tcp" on client side');
      }

      const { hostname, port } = _url2.default.parse('tcp://' + forward);
      if (!(0, _utils.isValidHostname)(hostname)) {
        throw Error('service.?forward.host is invalid');
      }
      if (!(0, _utils.isValidPort)(+port)) {
        throw Error('service.?forward.port is invalid');
      }
    }

    let server;

    if (json.servers) {
      if (!Array.isArray(json.servers)) {
        throw Error('"servers" must be provided as an array');
      }
      server = json.servers.find(server => !!server.enabled);
      if (!server) {
        throw Error('"servers" must have at least one enabled item');
      }
    } else {
      server = json.server;
    }
    Config._testServer(server, true);

    Config._testCommon(json);
  }

  static testOnServer(json) {
    Config._testServer(json, false);

    if (json.redirect !== undefined && json.redirect !== '') {
      if (typeof json.redirect !== 'string') {
        throw Error('"redirect" must be a string');
      }
      const parts = json.redirect.split(':');
      if (parts.length !== 2) {
        throw Error('"redirect" must be "<host or ip>:<port>"');
      }
      const [host, port] = parts;
      if (!(0, _utils.isValidHostname)(host) && !_net2.default.isIP(host)) {
        throw Error('"redirect" host is invalid');
      }
      if (!(0, _utils.isValidPort)(+port)) {
        throw Error('"redirect" port is invalid');
      }
    }

    Config._testCommon(json);
  }

  static _testServer(server, from_client) {
    if (!server.service) {
      throw Error('"service" must be provided as "<protocol>://<host>:<port>[?params]"');
    }

    const { protocol: _protocol, hostname, port } = _url2.default.parse(server.service);

    if (typeof _protocol !== 'string') {
      throw Error('service.protocol is invalid');
    }

    const protocol = _protocol.slice(0, -1);
    const available_server_protocols = ['tcp', 'ws', 'tls'];
    if (!available_server_protocols.includes(protocol)) {
      throw Error(`service.protocol must be: ${available_server_protocols.join(', ')}`);
    }

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

    if (!(0, _utils.isValidHostname)(hostname)) {
      throw Error('service.host is invalid');
    }

    if (!(0, _utils.isValidPort)(+port)) {
      throw Error('service.port is invalid');
    }

    if (typeof server.key !== 'string' || server.key === '') {
      throw Error('"server.key" must be a non-empty string');
    }

    if (!from_client && server.acl !== undefined) {
      if (typeof server.acl !== 'boolean') {
        throw Error('"server.acl" must be true or false');
      }
      if (server.acl) {
        if (typeof server.acl_conf !== 'string' || server.acl_conf === '') {
          throw Error('"server.acl_conf" must be a non-empty string');
        }
        const conf = _path2.default.resolve(process.cwd(), server.acl_conf);
        if (!_fs2.default.existsSync(conf)) {
          throw Error(`"server.acl_conf" "${conf}" not exist`);
        }
      }
    }

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

    if (!Array.isArray(server.presets)) {
      throw Error('"server.presets" must be an array');
    }

    if (server.presets.length < 1) {
      throw Error('"server.presets" must contain at least one preset');
    }

    for (const preset of server.presets) {
      const { name, params } = preset;
      if (typeof name !== 'string') {
        throw Error('"server.presets[].name" must be a string');
      }
      if (name === '') {
        throw Error('"server.presets[].name" cannot be empty');
      }
      if (params !== undefined) {
        if (!(0, _lodash2.default)(params)) {
          throw Error('"server.presets[].params" must be an plain object');
        }
        const clazz = (0, _presets.getPresetClassByName)(name);
        clazz.onCheckParams(params);
      }
    }
  }

  static _testCommon(common) {
    if (common.timeout !== undefined) {
      const { timeout } = common;
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

    if (common.log_path !== undefined) {
      if (typeof common.log_path !== 'string') {
        throw Error('"log_path" must be a string');
      }
    }

    if (common.log_level !== undefined) {
      const levels = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];
      if (!levels.includes(common.log_level)) {
        throw Error(`"log_level" must be one of [${levels}]`);
      }
    }

    if (common.log_max_days !== undefined) {
      const { log_max_days } = common;
      if (typeof log_max_days !== 'number') {
        throw Error('"log_max_days" must a number');
      }
      if (log_max_days < 1) {
        throw Error('"log_max_days" must be greater than 0');
      }
    }

    if (common.dns !== undefined) {
      const { dns } = common;
      if (!Array.isArray(dns)) {
        throw Error('"dns" must be an array');
      }
      for (const ip of dns) {
        if (!_net2.default.isIP(ip)) {
          throw Error(`"${ip}" is not an ip address`);
        }
      }
    }

    if (common.dns_expire !== undefined) {
      const { dns_expire } = common;
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
exports.Config = Config;