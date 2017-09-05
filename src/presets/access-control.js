import fs from 'fs';
import os from 'os';
import net from 'net';
import path from 'path';
import readline from 'readline';
import ip from 'ip';
import {
  IPreset,
  CONNECTION_CREATED,
  CONNECT_TO_REMOTE,
  PRESET_FAILED,
  PRESET_CLOSE_CONNECTION,
  PRESET_PAUSE_RECV,
  PRESET_PAUSE_SEND,
  PRESET_RESUME_RECV,
  PRESET_RESUME_SEND
} from './defs';
import {logger, isValidHostname, isValidPort} from '../utils';

let rules = [];

let cachedRules = {
  // <host:port>: <rule>
};

// rule's methods

function ruleIsMatch(host, port) {
  const {host: rHost, port: rPort} = this;
  const slashIndex = rHost.indexOf('/');

  let isHostMatch = false;
  if (slashIndex !== -1) {
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
    toString: ruleToString
  };
}

// helpers

function reloadRules(aclPath) {
  logger.verbose('[acl] (re)loading access list');
  const rs = fs.createReadStream(aclPath, {encoding: 'utf-8'});
  rs.on('error', (err) => {
    logger.warn(`[acl] fail to reload acl: ${err.message}, keep using previous rules`);
  });
  const rl = readline.createInterface({input: rs});
  const _rules = [];
  rl.on('line', (line) => {
    const rule = parseLine(line);
    if (rule !== null) {
      _rules.push(rule);
    }
  });
  rl.on('close', () => {
    rules = _rules.reverse();
    cachedRules = {};
    logger.info(`[acl] ${rules.length} rules loaded`);
  });
}

function findRule(host, port) {
  const cacheKey = `${host}:${port}`;
  const cacheRule = cachedRules[cacheKey];
  if (cacheRule !== undefined) {
    return cacheRule;
  } else {
    for (const rule of rules) {
      if (rule.isMatch(host, port)) {
        return cachedRules[cacheKey] = rule;
      }
    }
    // rule not found
    return cachedRules[cacheKey] = null;
  }
}

const DEFAULT_MAX_TRIES = 60;
const tries = {
  // <host>: <count>
};

/**
 * @description
 *   Apply access control to each connection.
 *
 * @notice
 *   This preset can ONLY be used on server side.
 *
 * @params
 *   acl: A path to a text file which contains a list of rules in order.
 *   max_tries(optional): The maximum tries from client, default is 60.
 *
 * @examples
 *   {
 *     "name": "access-control",
 *     "params": {
 *       "acl": "acl.txt",
 *       "max_tries": 60
 *     }
 *   }
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
export default class AccessControlPreset extends IPreset {

  // params(readonly)

  _aclPath = '';

  _maxTries = 0;

  // members

  _hrTimeBegin = process.hrtime();

  _remoteHost = null;

  _remotePort = null;

  _dstHost = null;

  _dstPort = null;

  _totalOut = 0;

  _totalIn = 0;

  // flags

  _isBlocking = false;

  _isDlPaused = false;

  _isUpPaused = false;

  static checkParams({acl, max_tries = DEFAULT_MAX_TRIES}) {
    if (typeof acl !== 'string' || acl === '') {
      throw Error('\'acl\' must be a non-empty string');
    }
    const aclPath = path.resolve(process.cwd(), acl);
    if (!fs.existsSync(aclPath)) {
      throw Error(`"${aclPath}" not found`);
    }
    if (max_tries !== undefined) {
      if (typeof max_tries !== 'number' || !Number.isInteger(max_tries)) {
        throw Error('\'max_tries\' must be an integer');
      }
      if (max_tries < 1) {
        throw Error('\'max_tries\' must be greater than 0');
      }
    }
    // note: should load rules once server up
    reloadRules(aclPath);
    fs.watchFile(aclPath, (curr, prev) => {
      if (curr.mtime > prev.mtime) {
        reloadRules(aclPath);
      }
    });
  }

  constructor({acl, max_tries = DEFAULT_MAX_TRIES}) {
    super();
    this._aclPath = path.resolve(process.cwd(), acl);
    this._maxTries = max_tries;
  }

  applyRule(rule) {
    const {host, port, isBan, upLimit, dlLimit} = rule;
    logger.debug(`[acl] [${this._remoteHost}:${this._remotePort}] apply rule: "${rule}"`);

    // ban
    if (isBan) {
      logger.info(`[acl] [${host}:${port}] baned by rule: "${rule}"`);
      this.broadcast({type: PRESET_CLOSE_CONNECTION});
      this._isBlocking = true;
    }

    // max_upload_speed
    if (upLimit !== '-') {
      // calculate average download speed
      const [sec, nano] = process.hrtime(this._hrTimeBegin);
      const speed = Math.ceil(this._totalIn / (sec + nano / 1e9)); // b/s

      logger.debug(`[acl] upload speed: ${speed}b/s`);

      if (speed > upLimit && !this._isUpPaused) {
        this._isUpPaused = true;
        this.broadcast({type: PRESET_PAUSE_RECV});

        // determine timeout to resume
        const timeout = speed / upLimit * 1.1; // more 10% cost
        const direction = `[${this._remoteHost}:${this._remotePort}] -> [${this._dstHost}:${this._dstPort}]`;
        logger.info(`[acl] ${direction} upload speed exceed: ${speed}b/s > ${upLimit}b/s, pause for ${timeout}s...`);

        setTimeout(() => {
          this.broadcast({type: PRESET_RESUME_RECV});
          this._isUpPaused = false;
        }, timeout * 1e3);
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
        this.broadcast({type: PRESET_PAUSE_SEND});

        // determine timeout to resume
        const timeout = speed / dlLimit * 1.1; // more 10% cost
        const direction = `[${this._remoteHost}:${this._remotePort}] <- [${this._dstHost}:${this._dstPort}]`;
        logger.info(`[acl] ${direction} download speed exceed: ${speed}b/s > ${dlLimit}b/s, pause for ${timeout}s...`);

        setTimeout(() => {
          this.broadcast({type: PRESET_RESUME_SEND});
          this._isDlPaused = false;
        }, timeout * 1e3);
      }
    }
  }

  checkRule(host, port) {
    const rule = findRule(host, port);
    if (rule !== null) {
      this.applyRule(rule);
    }
  }

  appendToAcl(line) {
    logger.info(`[acl] append rule: "${line}" to acl`);
    fs.appendFile(this._aclPath, `${os.EOL}${line}`, (err) => {
      if (err) {
        logger.warn(`[acl] fail to update acl: ${err.message}`);
      }
      rules.push(parseLine(line));
    });
  }

  onNotified({type, payload}) {
    switch (type) {
      case CONNECTION_CREATED: {
        const {host, port} = payload;
        this._remoteHost = host;
        this._remotePort = port;
        this.checkRule(host, port);
        break;
      }
      case CONNECT_TO_REMOTE: {
        const {host, port} = payload;
        this._dstHost = host;
        this._dstPort = port;
        this.checkRule(host, port);
        break;
      }
      case PRESET_FAILED: {
        const host = this._remoteHost;
        const maxTries = this._maxTries;
        if (tries[host] === undefined) {
          tries[host] = 0;
        }
        if (++tries[host] >= maxTries) {
          logger.warn(`[acl] ${host} max tries(${maxTries}) exceed`);
          this.broadcast({type: PRESET_CLOSE_CONNECTION});
          this._isBlocking = true;
          if (findRule(host, '*') === null) {
            this.appendToAcl(`${host}:* 1`);
          }
        }
        return;
      }
    }
  }

  beforeOut({buffer}) {
    this._totalOut += buffer.length;
    if (this._isBlocking) {
      return; // drop
    }
    this.checkRule(this._remoteHost, this._remotePort);
    this.checkRule(this._dstHost, this._dstPort);
    return buffer;
  }

  beforeIn({buffer}) {
    this._totalIn += buffer.length;
    if (this._isBlocking) {
      return; // drop
    }
    this.checkRule(this._remoteHost, this._remotePort);
    this.checkRule(this._dstHost, this._dstPort);
    return buffer;
  }

}
