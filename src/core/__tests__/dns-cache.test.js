import net from 'net';
import {DNSCache} from '../dns-cache';

describe('DNSCache#get', function () {

  it('should return an ip address', async function () {
    const dns = new DNSCache();
    dns.clear();
    expect(net.isIP(await dns.get('localhost'))).toBe(4);
    expect(net.isIP(await dns.get('localhost'))).toBe(4);
    expect(net.isIP(await dns.get('127.0.0.1'))).toBe(4);
  });

  it('should throw if fail to resolve', async function () {
    const dns = new DNSCache();
    dns.clear();
    try {
      await dns.get('xxx');
    } catch (err) {
      expect(err.message).toEqual('getaddrinfo ENOTFOUND xxx');
    }
  });

  it('should remove from poll if expire', async function () {
    const dns = new DNSCache({expire: 1e3});
    dns.clear();
    await dns.get('localhost');
    dns._now = () => Date.now() + 1e3;
    await dns.get('localhost');
    expect(DNSCache._pool).toEqual({});
  });

});

describe('DNSCache#_now', function () {

  it('should return a timestamp', function () {
    const dns = new DNSCache();
    dns.clear();
    const now = Date.now();
    expect(dns._now()).toBeGreaterThanOrEqual(now);
  });

});

describe('DNSCache#_put', function () {

  it('poll should be empty', function () {
    const dns = new DNSCache({expire: 0});
    dns.clear();
    dns._put('', '');
    expect(DNSCache._pool).toEqual({});
  });

});
