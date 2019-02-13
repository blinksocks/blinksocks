"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ACL = exports.ACL_RESUME_SEND = exports.ACL_RESUME_RECV = exports.ACL_PAUSE_SEND = exports.ACL_PAUSE_RECV = exports.ACL_CLOSE_CONNECTION = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _net = _interopRequireDefault(require("net"));

var _events = _interopRequireDefault(require("events"));

var _readline = _interopRequireDefault(require("readline"));

var _ip = _interopRequireDefault(require("ip"));

var _constants = require("../constants");

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const ACL_CLOSE_CONNECTION = 'acl_close_connection';
exports.ACL_CLOSE_CONNECTION = ACL_CLOSE_CONNECTION;
const ACL_PAUSE_RECV = 'acl_pause_recv';
exports.ACL_PAUSE_RECV = ACL_PAUSE_RECV;
const ACL_PAUSE_SEND = 'acl_pause_send';
exports.ACL_PAUSE_SEND = ACL_PAUSE_SEND;
const ACL_RESUME_RECV = 'acl_resume_recv';
exports.ACL_RESUME_RECV = ACL_RESUME_RECV;
const ACL_RESUME_SEND = 'acl_resume_send';
exports.ACL_RESUME_SEND = ACL_RESUME_SEND;

function ruleIsMatch(host, port) {
  const {
    host: rHost,
    port: rPort
  } = this;
  const slashIndex = rHost.indexOf('/');
  let isHostMatch = false;

  if (slashIndex !== -1 && _net.default.isIP(host)) {
    isHostMatch = _ip.default.cidrSubnet(rHost).contains(host);
  } else {
    isHostMatch = rHost === host;
  }

  if (rHost === '*' || isHostMatch) {
    if (rPort === '*' || port === rPort) {
      return true;
    }
  }

  return false;
}

function ruleToString() {
  return `${this.host}:${this.port} ${this.isBan ? 1 : 0} ${this.upLimit} ${this.dlLimit}`;
}

function parseHost(host) {
  const slashIndex = host.indexOf('/');

  if (slashIndex < 0) {
    if (host !== '*' && !_net.default.isIP(host) && !(0, _utils.isValidHostname)(host)) {
      return null;
    }

    return host;
  }

  if (slashIndex < 7) {
    return null;
  }

  const parts = host.split('/');
  const ip = parts[0];
  const mask = parts[parts.length - 1];

  if (!_net.default.isIP(ip)) {
    return null;
  }

  if (mask === '' || !Number.isInteger(+mask) || +mask < 0 || +mask > 32) {
    return null;
  }

  return host;
}

function parseSpeed(speed) {
  const regex = /^(\d+)(b|k|kb|m|mb|g|gb)$/g;
  const results = regex.exec(speed.toLowerCase());

  if (results !== null) {
    const [, num, unit] = results;
    return +num * {
      'b': 1,
      'k': 1024,
      'kb': 1024,
      'm': 1048576,
      'mb': 1048576,
      'g': 1073741824,
      'gb': 1073741824
    }[unit];
  }

  return null;
}

function parseLine(line) {
  if (line.length > 300) {
    return null;
  }

  line = line.trim();

  if (line.length < 1) {
    return null;
  }

  if (line[0] === '#') {
    return null;
  }

  if (line.indexOf('#') > 0) {
    line = line.substr(0, line.indexOf('#'));
  }

  const [addr, ban, up, dl] = line.split(' ').filter(p => p.length > 0);
  let _host = null;
  let _port = null;
  let _isBan = false;
  let _upLimit = '-';
  let _dlLimit = '-';

  if (addr.indexOf(':') > 0) {
    const parts = addr.split(':');
    const host = parts[0];
    const port = parts[parts.length - 1];
    _host = parseHost(host);

    if (port !== '*') {
      if (!(0, _utils.isValidPort)(+port)) {
        return null;
      }

      _port = +port;
    } else {
      _port = port;
    }
  } else {
    _host = parseHost(addr);
    _port = '*';
  }

  if (_host === null) {
    return null;
  }

  if (ban !== undefined) {
    if (ban !== '0' && ban !== '1') {
      return null;
    }

    _isBan = ban !== '0';
  }

  if (up !== undefined && up !== '-') {
    _upLimit = parseSpeed(up);

    if (!_upLimit) {
      return null;
    }
  }

  if (dl !== undefined && dl !== '-') {
    _dlLimit = parseSpeed(dl);

    if (!_dlLimit) {
      return null;
    }
  }

  return {
    host: _host,
    port: _port,
    isBan: _isBan,
    upLimit: _upLimit,
    dlLimit: _dlLimit,
    isMatch: ruleIsMatch,
    toString: ruleToString
  };
}

const DEFAULT_MAX_TRIES = 2;

class ACL extends _events.default {
  static async loadRules(aclPath) {
    return new Promise((resolve, reject) => {
      _utils.logger.verbose('[acl] loading access control list');

      const rs = _fs.default.createReadStream(aclPath, {
        encoding: 'utf-8'
      });

      rs.on('error', err => {
        _utils.logger.warn(`[acl] fail to reload access control list: ${err.message}`);

        reject(err);
      });

      const rl = _readline.default.createInterface({
        input: rs
      });

      const _rules = [];
      rl.on('line', line => {
        const rule = parseLine(line);

        if (rule !== null) {
          _rules.push(rule);
        }
      });
      rl.on('close', () => {
        const rules = _rules.reverse();

        _utils.logger.info(`[acl] ${rules.length} rules loaded`);

        resolve(rules);
      });
    });
  }

  constructor({
    sourceAddress,
    rules,
    max_tries = DEFAULT_MAX_TRIES
  }) {
    super();

    _defineProperty(this, "_rules", []);

    _defineProperty(this, "_cachedRules", {});

    _defineProperty(this, "_maxTries", 0);

    _defineProperty(this, "_hrTimeBegin", process.hrtime());

    _defineProperty(this, "_sourceHost", null);

    _defineProperty(this, "_sourcePort", null);

    _defineProperty(this, "_targetHost", null);

    _defineProperty(this, "_targetPort", null);

    _defineProperty(this, "_totalOut", 0);

    _defineProperty(this, "_totalIn", 0);

    _defineProperty(this, "_isDlPaused", false);

    _defineProperty(this, "_isUpPaused", false);

    this._sourceHost = sourceAddress.host;
    this._sourcePort = sourceAddress.port;
    this._rules = rules;
    this._maxTries = max_tries;
  }

  findRule(host, port) {
    const cacheKey = `${host}:${port}`;
    const cacheRule = this._cachedRules[cacheKey];

    if (cacheRule !== undefined) {
      return cacheRule;
    } else {
      for (const rule of this._rules) {
        if (rule.isMatch(host, port)) {
          return this._cachedRules[cacheKey] = rule;
        }
      }

      return this._cachedRules[cacheKey] = null;
    }
  }

  applyRule(rule) {
    const {
      isBan,
      upLimit,
      dlLimit
    } = rule;

    _utils.logger.debug(`[acl] [${this._sourceHost}:${this._sourcePort}] apply rule: "${rule}"`);

    if (isBan) {
      _utils.logger.info(`[acl] baned by rule: "${rule}"`);

      this.emit('action', {
        type: ACL_CLOSE_CONNECTION
      });
      return true;
    }

    if (upLimit !== '-') {
      const [sec, nano] = process.hrtime(this._hrTimeBegin);
      const speed = Math.ceil(this._totalIn / (sec + nano / 1e9));

      _utils.logger.debug(`[acl] upload speed: ${speed}b/s`);

      if (speed > upLimit && !this._isUpPaused) {
        this._isUpPaused = true;
        const timeout = speed / upLimit * 1.1;
        const direction = `[${this._sourceHost}:${this._sourcePort}] -> [${this._targetHost}:${this._targetPort}]`;

        _utils.logger.info(`[acl] ${direction} upload speed exceed: ${speed}b/s > ${upLimit}b/s, pause for ${timeout}s...`);

        this.emit('action', {
          type: ACL_PAUSE_RECV
        });
        setTimeout(() => {
          this.emit('action', {
            type: ACL_RESUME_RECV
          });
          this._isUpPaused = false;
        }, timeout * 1e3);
        return true;
      }
    }

    if (dlLimit !== '-') {
      const [sec, nano] = process.hrtime(this._hrTimeBegin);
      const speed = Math.ceil(this._totalOut / (sec + nano / 1e9));

      _utils.logger.debug(`[acl] download speed: ${speed}b/s`);

      if (speed > dlLimit && !this._isDlPaused) {
        this._isDlPaused = true;
        const timeout = speed / dlLimit * 1.1;
        const direction = `[${this._sourceHost}:${this._sourcePort}] <- [${this._targetHost}:${this._targetPort}]`;

        _utils.logger.info(`[acl] ${direction} download speed exceed: ${speed}b/s > ${dlLimit}b/s, pause for ${timeout}s...`);

        this.emit('action', {
          type: ACL_PAUSE_SEND
        });
        setTimeout(() => {
          this.emit('action', {
            type: ACL_RESUME_SEND
          });
          this._isDlPaused = false;
        }, timeout * 1e3);
        return true;
      }
    }

    return false;
  }

  checkRule(host, port) {
    const rule = this.findRule(host, port);

    if (rule !== null) {
      return this.applyRule(rule, host, port);
    }

    return false;
  }

  setTargetAddress(host, port) {
    this._targetHost = host;
    this._targetPort = port;
    return this.checkRule(host, port);
  }

  checkFailTimes(tries) {
    const host = this._sourceHost;
    const maxTries = this._maxTries;

    if (tries[host] === undefined) {
      tries[host] = 0;
    }

    if (++tries[host] >= maxTries) {
      _utils.logger.warn(`[acl] [${host}] max tries=${maxTries} exceed, ban it`);

      if (this.findRule(host, '*') === null) {
        this._rules.push(parseLine(`${host}:* 1`));
      }

      this.emit('action', {
        type: ACL_CLOSE_CONNECTION
      });
      return true;
    }
  }

  collect(type, size) {
    if (type === _constants.PIPE_ENCODE) {
      this._totalOut += size;
    } else {
      this._totalIn += size;
    }

    this.checkRule(this._sourceHost, this._sourcePort);
    this.checkRule(this._targetHost, this._targetPort);
  }

  destroy() {
    this._rules = null;
    this._cachedRules = null;
  }

}

exports.ACL = ACL;