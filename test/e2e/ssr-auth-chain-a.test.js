import run from '../common/run-e2e';

const clientJson = {
  "service": "socks5://127.0.0.1:1081",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "9{*2gdBSdCrgnSBD",
    "presets": [
      {"name": "ss-base"},
      {"name": "ssr-auth-chain-a"},
      {"name": "ss-stream-cipher", "params": {"method": "none"}}
    ]
  }
};

const serverJson = {
  "service": "tcp://127.0.0.1:1082",
  "key": "9{*2gdBSdCrgnSBD",
  "presets": [
    {"name": "ss-base"},
    {"name": "ssr-auth-chain-a"},
    {"name": "ss-stream-cipher", "params": {"method": "none"}}
  ]
};

test('ssr-auth-chain-a', async () => await run({clientJson, serverJson}));
