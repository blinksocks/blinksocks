import fs from 'fs';
import net from 'net';
import EventEmitter from 'events';
import readline from 'readline';
import ip from 'ip';
import { PIPE_ENCODE } from '../constants';
import { logger, isValidHostname, isValidPort } from '../utils';

export const ACL_CLOSE_CONNECTION = 'acl_close_connection';
export const ACL_PAUSE_RECV = 'acl_pause_recv';
export const ACL_PAUSE_SEND = 'acl_pause_send';
export const ACL_RESUME_RECV = 'acl_resume_recv';
export const ACL_RESUME_SEND = 'acl_resume_send';

// rule's methods

function ruleIsMatch(host, port) {
  const { host: rHost, port: rPort } = this;
  const slashIndex = rHost.indexOf('/');

  let isHostMatch = false;
  if (slashIndex !== -1 && net.isIP(host)) {
    isHostMatch = ip.cidrSubnet(rHost).contains(host);
  } else {
    isHostMatch = (rHost === host);
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

// rule parsing

function parseHost(host) {
  const slashIndex = host.indexOf('/');
  if (slashIndex < 0) {
    if (host !== '*' && !net.isIP(host) && !isValidHostname(host)) {
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
  if (!net.isIP(ip)) {
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
      'gb': 1073741824,
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

  // [addr[/mask][:port]]
  if (addr.indexOf(':') > 0) {
    const parts = addr.split(':');
    const host = parts[0];
    const port = parts[parts.length - 1];
    _host = parseHost(host);
    if (port !== '*') {
      if (!isValidPort(+port)) {
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

  // [ban]
  if (ban !== undefined) {
    if (ban !== '0' && ban !== '1') {
      return null;
    }
    _isBan = ban !== '0';
  }

  // [max_upload_speed(/s)]
  if (up !== undefined && up !== '-') {
    _upLimit = parseSpeed(up);
    if (!_upLimit) {
      return null;
    }
  }

  // [max_download_speed(/s)]
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
    toString: ruleToString,
  };
}

const DEFAULT_MAX_TRIES = 2;

/**
 *   Access Control List
 *
 *   // acl.txt
 *   # [addr[/mask][:port]] [ban] [max_upload_speed(/s)] [max_download_speed(/s)]
 *
 *   example.com     1            # prevent access to example.com
 *   example.com:*   1            # prevent access to example.com:*, equal to above
 *   example.com:443 1            # prevent access to example.com:443 only
 *   *:25            1            # prevent access to SMTP servers
 *   *:*             1            # prevent all access from/to all endpoints
 *   127.0.0.1       1            # ban localhost
 *   192.168.0.0/16  1            # ban hosts in 192.168.*.*
 *   172.27.1.100    0 120K       # limit upload speed to 120KB/s
 *   172.27.1.100    0 -    120K  # limit download speed to 120KB/s
 *   172.27.1.100    0 120K 120K  # limit upload and download speed to 120KB/s
 */
export class ACL extends EventEmitter {

  _rules = [];

  _cachedRules = {
    // <host:port>: <rule>
  };

  _maxTries = 0;

  // members

  _hrTimeBegin = process.hrtime();

  _sourceHost = null;

  _sourcePort = null;

  _targetHost = null;

  _targetPort = null;

  _totalOut = 0;

  _totalIn = 0;

  // flags

  _isDlPaused = false;

  _isUpPaused = false;

  static async loadRules(aclPath) {
    return new Promise((resolve, reject) => {
      logger.verbose('[acl] loading access control list');
      const rs = fs.createReadStream(aclPath, { encoding: 'utf-8' });
      rs.on('error', (err) => {
        logger.warn(`[acl] fail to reload access control list: ${err.message}`);
        reject(err);
      });
      const rl = readline.createInterface({ input: rs });
      const _rules = [];
      rl.on('line', (line) => {
        const rule = parseLine(line);
        if (rule !== null) {
          _rules.push(rule);
        }
      });
      rl.on('close', () => {
        const rules = _rules.reverse();
        logger.info(`[acl] ${rules.length} rules loaded`);
        resolve(rules);
      });
    });
  }

  constructor({ sourceAddress, rules, max_tries = DEFAULT_MAX_TRIES }) {
    super();
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
      // rule not found
      return this._cachedRules[cacheKey] = null;
    }
  }

  applyRule(rule) {
    const { isBan, upLimit, dlLimit } = rule;
    logger.debug(`[acl] [${this._sourceHost}:${this._sourcePort}] apply rule: "${rule}"`);

    // ban
    if (isBan) {
      logger.info(`[acl] baned by rule: "${rule}"`);
      this.emit('action', { type: ACL_CLOSE_CONNECTION });
      return true;
    }

    // max_upload_speed
    if (upLimit !== '-') {
      // calculate average download speed
      const [sec, nano] = process.hrtime(this._hrTimeBegin);
      const speed = Math.ceil(this._totalIn / (sec + nano / 1e9)); // b/s

      logger.debug(`[acl] upload speed: ${speed}b/s`);

      if (speed > upLimit && !this._isUpPaused) {
        this._isUpPaused = true;

        // determine timeout to resume
        const timeout = speed / upLimit * 1.1; // more 10% cost
        const direction = `[${this._sourceHost}:${this._sourcePort}] -> [${this._targetHost}:${this._targetPort}]`;
        logger.info(`[acl] ${direction} upload speed exceed: ${speed}b/s > ${upLimit}b/s, pause for ${timeout}s...`);

        this.emit('action', { type: ACL_PAUSE_RECV });
        setTimeout(() => {
          this.emit('action', { type: ACL_RESUME_RECV });
          this._isUpPaused = false;
        }, timeout * 1e3);
        return true;
      }
    }

    // max_download_speed
    if (dlLimit !== '-') {
      // calculate average download speed
      const [sec, nano] = process.hrtime(this._hrTimeBegin);
      const speed = Math.ceil(this._totalOut / (sec + nano / 1e9)); // b/s

      logger.debug(`[acl] download speed: ${speed}b/s`);

      if (speed > dlLimit && !this._isDlPaused) {
        this._isDlPaused = true;

        // determine timeout to resume
        const timeout = speed / dlLimit * 1.1; // more 10% cost
        const direction = `[${this._sourceHost}:${this._sourcePort}] <- [${this._targetHost}:${this._targetPort}]`;
        logger.info(`[acl] ${direction} download speed exceed: ${speed}b/s > ${dlLimit}b/s, pause for ${timeout}s...`);

        this.emit('action', { type: ACL_PAUSE_SEND });
        setTimeout(() => {
          this.emit('action', { type: ACL_RESUME_SEND });
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
      logger.warn(`[acl] [${host}] max tries=${maxTries} exceed, ban it`);
      if (this.findRule(host, '*') === null) {
        this._rules.push(parseLine(`${host}:* 1`));
      }
      this.emit('action', { type: ACL_CLOSE_CONNECTION });
      return true;
    }
  }

  collect(type, size) {
    if (type === PIPE_ENCODE) {
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
