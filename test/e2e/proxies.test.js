import path from 'path';
import run from '../common/run-e2e';

const tlsKey = path.resolve(__dirname, 'resources', 'key.pem');
const tlsCert = path.resolve(__dirname, 'resources', 'cert.pem');

const clientJson = {
  // "service": "",
  'server': {
    'service': 'tcp://localhost:1082',
    'key': '9{*2gdBSdCrgnSBD',
    'presets': [
      { 'name': 'ss-base' },
      { 'name': 'obfs-random-padding' },
      { 'name': 'ss-stream-cipher', 'params': { 'method': 'aes-128-ctr' } },
    ],
  },
  'https_key': tlsKey,
  'https_cert': tlsCert,
};

const serverJson = {
  'service': 'tcp://127.0.0.1:1082',
  'key': '9{*2gdBSdCrgnSBD',
  'presets': [
    { 'name': 'ss-base' },
    { 'name': 'obfs-random-padding' },
    { 'name': 'ss-stream-cipher', 'params': { 'method': 'aes-128-ctr' } },
  ],
};

test('http', async () => await run({
  proxy: 'http',
  clientJson: { ...clientJson, service: 'http://127.0.0.1:1081' },
  serverJson,
}));
test('http with authorization', async () => {
  await run({
    proxy: 'http',
    auth: {
      username: 'user',
      password: 'pass',
    },
    clientJson: { ...clientJson, service: 'http://user:pass@127.0.0.1:1081' },
    serverJson,
  });
  await run({
    proxy: 'http',
    auth: {
      username: '_user',
      password: '_pass',
    },
    clientJson: { ...clientJson, service: 'http://user:pass@127.0.0.1:1081' },
    serverJson,
    not: true,
  });
});

test('https with authorization', async () => {
  await run({
    proxy: 'https',
    auth: {
      username: 'user',
      password: 'pass',
    },
    clientJson: { ...clientJson, service: 'https://user:pass@127.0.0.1:1081' },
    serverJson,
  });
  await run({
    proxy: 'https',
    auth: {
      username: '_user',
      password: '_pass',
    },
    clientJson: { ...clientJson, service: 'https://user:pass@127.0.0.1:1081' },
    serverJson,
    not: true,
  });
});

test('http using connect', async () => await run({
  proxy: 'http_connect',
  clientJson: { ...clientJson, service: 'http://127.0.0.1:1081' },
  serverJson,
}));
test('http using connect with authorization', async () => {
  await run({
    proxy: 'http_connect',
    auth: {
      username: 'user',
      password: 'pass',
    },
    clientJson: { ...clientJson, service: 'http://user:pass@127.0.0.1:1081' },
    serverJson,
  });
  await run({
    proxy: 'http_connect',
    auth: {
      username: '_user',
      password: '_pass',
    },
    clientJson: { ...clientJson, service: 'http://user:pass@127.0.0.1:1081' },
    serverJson,
    not: true,
  });
});

test('socks', async () => await run({
  proxy: 'socks',
  clientJson: { ...clientJson, service: 'socks://127.0.0.1:1081' },
  serverJson,
}));
test('socks with authorization', async () => {
  await run({
    proxy: 'socks',
    auth: {
      username: 'user',
      password: 'pass',
    },
    clientJson: { ...clientJson, service: 'socks://user:pass@127.0.0.1:1081' },
    serverJson,
  });
  await run({
    proxy: 'socks',
    auth: {
      username: '_user',
      password: '_pass',
    },
    clientJson: { ...clientJson, service: 'socks://user:pass@127.0.0.1:1081' },
    serverJson,
    not: true,
  });
});

test('socks4', async () => await run({
  proxy: 'socks4',
  clientJson: { ...clientJson, service: 'socks4://127.0.0.1:1081' },
  serverJson,
}));
test('socks4 with authorization', async () => await run({
  proxy: 'socks4',
  auth: {
    username: 'user',
    password: 'pass',
  },
  clientJson: { ...clientJson, service: 'socks4://user:pass@127.0.0.1:1081' },
  serverJson,
}));

test('socks4a', async () => await run({
  proxy: 'socks4a',
  clientJson: { ...clientJson, service: 'socks4a://127.0.0.1:1081' },
  serverJson,
}));
test('socks4a with authorization', async () => await run({
  proxy: 'socks4a',
  auth: {
    username: 'user',
    password: 'pass',
  },
  clientJson: { ...clientJson, service: 'socks4a://user:pass@127.0.0.1:1081' },
  serverJson,
}));

test('socks5', async () => await run({
  proxy: 'socks5',
  clientJson: { ...clientJson, service: 'socks5://127.0.0.1:1081' },
  serverJson,
}));
test('socks5 with authorization', async () => await run({
  proxy: 'socks5',
  auth: {
    username: 'user',
    password: 'pass',
  },
  clientJson: { ...clientJson, service: 'socks5://user:pass@127.0.0.1:1081' },
  serverJson,
}));
