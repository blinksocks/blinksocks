'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DNSCache = exports.DNS_DEFAULT_EXPIRE = undefined;

var _dns = require('dns');

var _dns2 = _interopRequireDefault(_dns);

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _logger = require('./logger');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

async function lookup(hostname) {
  return new Promise((resolve, reject) => {
    _dns2.default.lookup(hostname, function (err, address) {
      if (err) {
        reject(err);
      } else {
        resolve(address);
      }
    });
  });
}

function now() {
  return Date.now();
}

const DNS_DEFAULT_EXPIRE = exports.DNS_DEFAULT_EXPIRE = 3600000;

class DNSCache {

  static init(expire) {
    if (typeof expire === 'number' && expire >= 0) {
      DNSCache.expire = expire;
    }
    DNSCache.pool = {};
  }

  static async get(hostname) {
    if (_net2.default.isIP(hostname)) {
      return hostname;
    }
    let address = null;
    if (!DNSCache.pool[hostname]) {
      address = await lookup(hostname);
      DNSCache._put(hostname, address);
    } else {
      const [addr, expire] = DNSCache.pool[hostname];
      const _now = now();
      if (_now >= expire) {
        delete DNSCache.pool[hostname];
      }
      _logger.logger.verbose(`[dns-cache] hit: hostname=${hostname} resolved=${addr} ttl=${expire - _now}ms`);
      address = addr;
    }
    return address;
  }

  static clear() {
    DNSCache.pool = {};
  }

  static _put(hostname, address) {
    if (DNSCache.expire > 0) {
      const expire = now() + DNSCache.expire;
      DNSCache.pool[hostname] = [address, expire];
    }
  }

}
exports.DNSCache = DNSCache;
DNSCache.pool = {};
DNSCache.expire = DNS_DEFAULT_EXPIRE;