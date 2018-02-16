import run from '../common/run-e2e';

const clientJson = {
  "service": "socks5://127.0.0.1:1081",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "9{*2gdBSdCrgnSBD",
    "presets": [
      {"name": "ss-base"},
      {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm"}},
    ]
  }
};

const serverJson = {
  "service": "tcp://127.0.0.1:1082",
  "key": "9{*2gdBSdCrgnSBD",
  "presets": [
    {"name": "ss-base"},
    {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm"}},
  ]
};

test('aead-random-cipher', async () => await run({clientJson, serverJson}));
