import net from 'net';
import {DNSCache, DNS_SURVIVAL_TIME} from '../dns-cache';

describe('DNSCache#create', function () {

  it('should return an instance of DNSCache', function () {
    expect(DNSCache.create()).toBeInstanceOf(DNSCache);
  });

});

describe('DNSCache#get', function () {

  it('should return an ip address', async function () {
    const dns = DNSCache.create();
    expect(net.isIP(await dns.get('localhost'))).toBe(4);
    expect(net.isIP(await dns.get('localhost'))).toBe(4);
  });

  it('should throw if fail to resolve', async function () {
    const dns = DNSCache.create();
    try {
      await dns.get('xxx');
    } catch (err) {
      expect(err.message).toEqual('getaddrinfo ENOTFOUND xxx');
    }
  });

  it('should remove from this._poll if expire', async function () {
    const dns = DNSCache.create();
    await dns.get('localhost');
    dns._now = () => (new Date()).getTime() + DNS_SURVIVAL_TIME;
    await dns.get('localhost');
    expect(dns._pool).toEqual({});
  });

});

describe('DNSCache#_now', function () {

  it('should return a timestamp', function () {
    const dns = DNSCache.create();
    const now = (new Date()).getTime();
    expect(dns._now()).toBeGreaterThanOrEqual(now);
  });

});
