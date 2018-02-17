import dns from 'dns';
import net from 'net';
import { logger } from './logger';

async function lookup(hostname) {
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

function now() {
  return Date.now();
}

export const DNS_DEFAULT_EXPIRE = 3600000;

export class DNSCache {

  static pool = {
    // <hostname>: [address, expire]
  };

  static expire = DNS_DEFAULT_EXPIRE;

  static init(expire) {
    if (typeof expire === 'number' && expire >= 0) {
      DNSCache.expire = expire;
    }
    DNSCache.pool = {};
  }

  static async get(hostname) {
    if (net.isIP(hostname)) {
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
      logger.verbose(`[dns-cache] hit: hostname=${hostname} resolved=${addr} ttl=${expire - _now}ms`);
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
