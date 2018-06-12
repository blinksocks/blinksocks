import net from 'net';
import { DNSCache } from '../../../src/utils/dns-cache';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

it('should return an ip address', async function() {
  DNSCache.clear();
  expect(net.isIP(await DNSCache.get('localhost'))).toBe(4);
  expect(net.isIP(await DNSCache.get('localhost'))).toBe(4);
  expect(net.isIP(await DNSCache.get('127.0.0.1'))).toBe(4);
});

it('should throw if fail to resolve', async function() {
  try {
    await DNSCache.get('xxx');
  } catch (err) {
    expect(err.message).toEqual('getaddrinfo ENOTFOUND xxx');
  }
});

it('should remove from pool if expire', async function() {
  DNSCache.init(100);
  await DNSCache.get('localhost');
  await sleep(100);
  await DNSCache.get('localhost');
  expect(DNSCache.pool).toEqual({});
});

it('pool should be empty', function() {
  DNSCache.init(0);
  DNSCache._put('', '');
  expect(DNSCache.pool).toEqual({});
});
