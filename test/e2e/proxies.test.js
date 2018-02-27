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

test('http-proxy connect', async () => await run({
  proxy: 'http_connect',
  clientJson: { ...clientJson, service: 'http://127.0.0.1:1081' },
  serverJson,
}));

test('socks-proxy', async () => await run({
  proxy: 'socks',
  clientJson: { ...clientJson, service: 'socks://127.0.0.1:1081' },
  serverJson,
}));

// TODO: make curl --socks4 work
// test('socks4-proxy', async () => await run({
//   proxy: 'socks4',
//   clientJson: {...clientJson, service: 'socks4://127.0.0.1:1081'},
//   serverJson,
// }));

test('socks4a-proxy', async () => await run({
  proxy: 'socks4a',
  clientJson: { ...clientJson, service: 'socks4a://127.0.0.1:1081' },
  serverJson,
}));

test('socks5-proxy', async () => await run({
  proxy: 'socks5',
  clientJson: { ...clientJson, service: 'socks5://127.0.0.1:1081' },
  serverJson,
}));
