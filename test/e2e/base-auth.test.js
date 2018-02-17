import run from '../common/run-e2e';

const clientJson = {
  "service": "socks5://127.0.0.1:1081",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "9{*2gdBSdCrgnSBD",
    "presets": [
      { "name": "base-auth", "params": { "method": "sha1" } },
    ]
  }
};

const serverJson = {
  "service": "tcp://127.0.0.1:1082",
  "key": "9{*2gdBSdCrgnSBD",
  "presets": [
    { "name": "base-auth", "params": { "method": "sha1" } },
  ]
};

test('base-auth', async () => await run({ clientJson, serverJson }));
