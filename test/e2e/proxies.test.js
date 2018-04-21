import run from '../common/run-e2e';

const clientJson = {
  // "service": "",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "9{*2gdBSdCrgnSBD",
    "presets": [
      { "name": "ss-base" },
      { "name": "obfs-random-padding" },
      { "name": "ss-stream-cipher", "params": { "method": "aes-128-ctr" } }
    ]
  }
};

const serverJson = {
  "service": "tcp://127.0.0.1:1082",
  "key": "9{*2gdBSdCrgnSBD",
  "presets": [
    { "name": "ss-base" },
    { "name": "obfs-random-padding" },
    { "name": "ss-stream-cipher", "params": { "method": "aes-128-ctr" } }
  ]
};

test('http-proxy', async () => await run({
  proxy: 'http',
  clientJson: { ...clientJson, service: 'http://127.0.0.1:1081' },
  serverJson,
}));
test('http-proxy with authorization', async () => await run({
  proxy: 'http',
  auth: {
    username: 'user',
    password: 'pass',
  },
  clientJson: { ...clientJson, service: 'http://user:pass@127.0.0.1:1081' },
  serverJson,
}));

test('http-proxy using connect', async () => await run({
  proxy: 'http_connect',
  clientJson: { ...clientJson, service: 'http://127.0.0.1:1081' },
  serverJson,
}));
test('http-proxy using connect with authorization', async () => await run({
  proxy: 'http_connect',
  auth: {
    username: 'user',
    password: 'pass',
  },
  clientJson: { ...clientJson, service: 'http://user:pass@127.0.0.1:1081' },
  serverJson,
}));

test('socks-proxy', async () => await run({
  proxy: 'socks',
  clientJson: { ...clientJson, service: 'socks://127.0.0.1:1081' },
  serverJson,
}));
test('socks-proxy with authorization', async () => await run({
  proxy: 'socks',
  auth: {
    username: 'user',
    password: 'pass',
  },
  clientJson: { ...clientJson, service: 'socks://user:pass@127.0.0.1:1081' },
  serverJson,
}));

test('socks4-proxy', async () => await run({
  proxy: 'socks4',
  clientJson: { ...clientJson, service: 'socks4://127.0.0.1:1081' },
  serverJson,
}));
test('socks4-proxy with authorization', async () => await run({
  proxy: 'socks4',
  auth: {
    username: 'user',
    password: 'pass',
  },
  clientJson: { ...clientJson, service: 'socks4://user:pass@127.0.0.1:1081' },
  serverJson,
}));

test('socks4a-proxy', async () => await run({
  proxy: 'socks4a',
  clientJson: { ...clientJson, service: 'socks4a://127.0.0.1:1081' },
  serverJson,
}));
test('socks4a-proxy with authorization', async () => await run({
  proxy: 'socks4a',
  auth: {
    username: 'user',
    password: 'pass',
  },
  clientJson: { ...clientJson, service: 'socks4a://user:pass@127.0.0.1:1081' },
  serverJson,
}));

test('socks5-proxy', async () => await run({
  proxy: 'socks5',
  clientJson: { ...clientJson, service: 'socks5://127.0.0.1:1081' },
  serverJson,
}));
test('socks5-proxy with authorization', async () => await run({
  proxy: 'socks5',
  auth: {
    username: 'user',
    password: 'pass',
  },
  clientJson: { ...clientJson, service: 'socks5://user:pass@127.0.0.1:1081' },
  serverJson,
}));
