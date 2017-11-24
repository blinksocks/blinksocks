import dns from 'dns';
import net from 'net';
import {logger} from '../utils';

export const DNS_DEFAULT_EXPIRE = 3600000;

export class DNSCache {

  static _pool = {};

  _expire = DNS_DEFAULT_EXPIRE;

  constructor({expire} = {}) {
    if (expire !== undefined) {
      this._expire = expire;
    }
  }

  _now() {
    return Date.now();
  }

  async _lookup(hostname) {
    return new Promise((resolve, reject) => {
      dns.lookup(hostname, function (err, address) {
        if (err) {
          reject(err);
        } else {
          resolve(address);
        }
      });
    });
  }

  _put(hostname, address) {
    if (this._expire > 0) {
      const expire = this._now() + this._expire;
      DNSCache._pool[hostname] = [address, expire];
    }
  }

  async get(hostname) {
    if (net.isIP(hostname)) {
      return hostname;
    }
    let address = null;
    if (DNSCache._pool[hostname] === undefined) {
      address = await this._lookup(hostname);
      this._put(hostname, address);
    } else {
      const [addr, expire] = DNSCache._pool[hostname];
      const now = this._now();
      if (now >= expire) {
        delete DNSCache._pool[hostname];
      }
      logger.verbose(`[dns-cache] hit: hostname=${hostname} resolved=${addr} ttl=${expire - now}ms`);
      address = addr;
    }
    return address;
  }

  clear() {
    DNSCache._pool = {};
  }

}
