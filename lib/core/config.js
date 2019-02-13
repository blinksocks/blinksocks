"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Config = void 0;

var _dns = _interopRequireDefault(require("dns"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _net = _interopRequireDefault(require("net"));

var _url = require("url");

var _chalk = _interopRequireDefault(require("chalk"));

var _winston = _interopRequireDefault(require("winston"));

var _winstonDailyRotateFile = _interopRequireDefault(require("winston-daily-rotate-file"));

var _lodash = _interopRequireDefault(require("lodash.isplainobject"));

var _acl = require("./acl");

var _constants = require("../constants");

var _presets = require("../presets");

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function loadFileSync(file) {
  return _fs.default.readFileSync(_path.default.resolve(process.cwd(), file));
}

class Config {
  constructor(json) {
    _defineProperty(this, "_ready", null);

    _defineProperty(this, "local_protocol", null);

    _defineProperty(this, "local_username", null);

    _defineProperty(this, "local_password", null);

    _defineProperty(this, "local_search_params", null);

    _defineProperty(this, "local_host", null);

    _defineProperty(this, "local_port", null);

    _defineProperty(this, "local_pathname", null);

    _defineProperty(this, "server", null);

    _defineProperty(this, "is_client", null);

    _defineProperty(this, "is_server", null);

    _defineProperty(this, "https_key", null);

    _defineProperty(this, "https_cert", null);

    _defineProperty(this, "timeout", null);

    _defineProperty(this, "redirect", null);

    _defineProperty(this, "dns_expire", null);

    _defineProperty(this, "dns", null);

    _defineProperty(this, "server_protocol", null);

    _defineProperty(this, "server_host", null);

    _defineProperty(this, "server_port", null);

    _defineProperty(this, "server_pathname", null);

    _defineProperty(this, "tls_cert", null);

    _defineProperty(this, "tls_cert_self_signed", false);

    _defineProperty(this, "tls_key", null);

    _defineProperty(this, "key", null);

    _defineProperty(this, "acl", false);

    _defineProperty(this, "acl_conf", '');

    _defineProperty(this, "acl_rules", []);

    _defineProperty(this, "acl_tries", {});

    _defineProperty(this, "presets", null);

    _defineProperty(this, "udp_presets", null);

    _defineProperty(this, "mux", false);

    _defineProperty(this, "mux_concurrency", null);

    _defineProperty(this, "log_path", null);

    _defineProperty(this, "log_level", null);

    _defineProperty(this, "log_max_days", null);

    _defineProperty(this, "stores", []);

    const {
      protocol,
      hostname,
      port,
      pathname,
      searchParams,
      username,
      password
    } = new _url.URL(json.service);
    this.local_protocol = protocol.slice(0, -1);
    this.local_username = username;
    this.local_password = password;
    this.local_search_params = searchParams;
    this.local_host = hostname;
    this.local_port = +port || +_constants.PROTOCOL_DEFAULT_PORTS[protocol];
    this.local_pathname = pathname;
    let server;

    if (json.servers !== undefined) {
      server = json.servers.find(server => !!server.enabled);
      console.log(_chalk.default.bgYellowBright('WARN'), '"servers" will be deprecated in the next version,' + ' please configure only one server in "server: {...}",' + ' for migration guide please refer to CHANGELOG.md.');
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

    if (this.is_client && this.local_protocol === 'https') {
      _utils.logger.info(`[config] loading ${json.https_cert}`);

      this.https_cert = loadFileSync(json.https_cert);

      _utils.logger.info(`[config] loading ${json.https_key}`);

      this.https_key = loadFileSync(json.https_key);
    }

    this.timeout = json.timeout !== undefined ? json.timeout * 1e3 : 600 * 1e3;
    this.dns_expire = json.dns_expire !== undefined ? json.dns_expire * 1e3 : _utils.DNS_DEFAULT_EXPIRE;

    if (json.dns !== undefined && json.dns.length > 0) {
      this.dns = json.dns;

      _dns.default.setServers(json.dns);
    }

    _utils.DNSCache.init(this.dns_expire);

    this._ready = this._initServer(this.is_server ? json : server);
  }

  async _initServer(server) {
    const {
      protocol,
      hostname,
      port,
      pathname
    } = new _url.URL(server.service);
    this.server_protocol = protocol.slice(0, -1);
    this.server_host = hostname;
    this.server_port = +port || +_constants.PROTOCOL_DEFAULT_PORTS[protocol];
    this.server_pathname = pathname;

    if (['tls', 'wss', 'h2'].includes(this.server_protocol)) {
      if (this.is_client) {
        this.tls_cert_self_signed = !!server.tls_cert_self_signed;
      }

      if (this.tls_cert_self_signed || this.is_server) {
        _utils.logger.info(`[config] loading ${server.tls_cert}`);

        this.tls_cert = loadFileSync(server.tls_cert);
      }

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
      this.acl_rules = await _acl.ACL.loadRules(_path.default.resolve(process.cwd(), server.acl_conf));
    }

    if (server.redirect !== undefined) {
      this.redirect = server.redirect;
    }

    this.mux = server.mux === true;

    if (this.is_client) {
      this.mux_concurrency = server.mux_concurrency || 10;
    }

    this.stores = new Array(this.presets.length).fill({});

    for (let i = 0; i < this.presets.length; i++) {
      const {
        name,
        params = {}
      } = this.presets[i];
      const clazz = (0, _presets.getPresetClassByName)(name);
      const data = await clazz.onCache(params, this.stores[i]);

      if (typeof data !== 'undefined') {
        this.stores[i] = data;
      }
    }
  }

  _initLogger(json) {
    this.log_path = _path.default.resolve(process.cwd(), json.log_path || 'blinksocks.log');
    this.log_level = json.log_level || 'info';
    this.log_max_days = json.log_max_days || null;
    const {
      transports,
      format: {
        printf,
        combine,
        timestamp,
        splat,
        prettyPrint
      }
    } = _winston.default;
    const trans = [new transports.Console()];

    if (process.env.NODE_ENV !== 'test') {
      trans.push(new _winstonDailyRotateFile.default({
        filename: this.log_path,
        maxFiles: this.log_max_days ? this.log_max_days + 'd' : null
      }));
    }

    _utils.logger.configure({
      level: process.env.NODE_ENV === 'test' ? 'error' : this.log_level,
      format: combine(timestamp(), splat(), prettyPrint(), printf(info => `${info.timestamp} - ${info.level}: ${info.message}`)),
      transports: trans
    });
  }

  static test(json) {
    if (!(0, _lodash.default)(json)) {
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

    const {
      protocol,
      hostname,
      port: _port,
      searchParams
    } = new _url.URL(json.service);

    if (typeof protocol !== 'string') {
      throw Error('service.protocol is invalid');
    }

    const proto = protocol.slice(0, -1);
    const available_client_protocols = ['tcp', 'http', 'https', 'socks', 'socks5', 'socks4', 'socks4a'];

    if (!available_client_protocols.includes(proto)) {
      throw Error(`service.protocol must be: ${available_client_protocols.join(', ')}`);
    }

    if (!(0, _utils.isValidHostname)(hostname)) {
      throw Error('service.host is invalid');
    }

    const port = _port || _constants.PROTOCOL_DEFAULT_PORTS[protocol] || '';

    if (!(0, _utils.isValidPort)(+port)) {
      throw Error('service.port is invalid');
    }

    if (proto === 'tcp') {
      const forward = searchParams.get('forward');

      if (!forward) {
        throw Error('require "?forward=<host>:<port>" parameter in service when using "tcp" on client side');
      }

      const {
        hostname,
        port
      } = new _url.URL('tcp://' + forward);

      if (!(0, _utils.isValidHostname)(hostname)) {
        throw Error('service.?forward.host is invalid');
      }

      if (!(0, _utils.isValidPort)(+port)) {
        throw Error('service.?forward.port is invalid');
      }
    }

    if (proto === 'https') {
      if (typeof json.https_cert !== 'string' || json.https_cert === '') {
        throw Error('"https_cert" must be provided');
      }

      if (typeof json.https_key !== 'string' || json.https_key === '') {
        throw Error('"https_key" must be provided');
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

      if (!(0, _utils.isValidHostname)(host) && !_net.default.isIP(host)) {
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

    const {
      protocol,
      hostname,
      port: _port
    } = new _url.URL(server.service);

    if (typeof protocol !== 'string') {
      throw Error('service.protocol is invalid');
    }

    const proto = protocol.slice(0, -1);
    const available_server_protocols = ['tcp', 'ws', 'wss', 'tls', 'h2'];

    if (!available_server_protocols.includes(proto)) {
      throw Error(`service.protocol must be: ${available_server_protocols.join(', ')}`);
    }

    if (proto === 'h2') {
      try {
        require('http2');
      } catch (e) {
        throw Error('You must upgrade Node.js to 8.4.0 or above before using HTTP2');
      }
    }

    if (['tls', 'wss', 'h2'].includes(proto)) {
      if (from_client && server.tls_cert_self_signed) {
        if (typeof server.tls_cert !== 'string' || server.tls_cert === '') {
          throw Error('"tls_cert" must be provided when "tls_cert_self_signed" is set');
        }
      }

      if (!from_client) {
        if (typeof server.tls_cert !== 'string' || server.tls_cert === '') {
          throw Error('"tls_cert" must be provided');
        }

        if (typeof server.tls_key !== 'string' || server.tls_key === '') {
          throw Error('"tls_key" must be provided');
        }
      }
    }

    if (!(0, _utils.isValidHostname)(hostname)) {
      throw Error('service.host is invalid');
    }

    const port = _port || _constants.PROTOCOL_DEFAULT_PORTS[protocol] || '';

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

        const conf = _path.default.resolve(process.cwd(), server.acl_conf);

        if (!_fs.default.existsSync(conf)) {
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
      const {
        name,
        params
      } = preset;

      if (typeof name !== 'string') {
        throw Error('"server.presets[].name" must be a string');
      }

      if (name === '') {
        throw Error('"server.presets[].name" cannot be empty');
      }

      if (params !== undefined) {
        if (!(0, _lodash.default)(params)) {
          throw Error('"server.presets[].params" must be an plain object');
        }

        const clazz = (0, _presets.getPresetClassByName)(name);
        clazz.onCheckParams(params);
      }
    }
  }

  static _testCommon(common) {
    if (common.timeout !== undefined) {
      const {
        timeout
      } = common;

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

      const absolutePath = _path.default.resolve(process.cwd(), common.log_path);

      if (_fs.default.existsSync(absolutePath) && !_fs.default.statSync(absolutePath).isFile()) {
        throw Error('"log_path" must be a file not directory');
      }
    }

    if (common.log_level !== undefined) {
      const levels = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];

      if (!levels.includes(common.log_level)) {
        throw Error(`"log_level" must be one of [${levels}]`);
      }
    }

    if (common.log_max_days !== undefined) {
      const {
        log_max_days
      } = common;

      if (typeof log_max_days !== 'number') {
        throw Error('"log_max_days" must a number');
      }

      if (log_max_days < 1) {
        throw Error('"log_max_days" must be greater than 0');
      }
    }

    if (common.dns !== undefined) {
      const {
        dns
      } = common;

      if (!Array.isArray(dns)) {
        throw Error('"dns" must be an array');
      }

      for (const ip of dns) {
        if (!_net.default.isIP(ip)) {
          throw Error(`"${ip}" is not an ip address`);
        }
      }
    }

    if (common.dns_expire !== undefined) {
      const {
        dns_expire
      } = common;

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