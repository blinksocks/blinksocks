import run from '../common/run-e2e';

const clientJson = {
  "service": "socks5://127.0.0.1:1081",
  "server": {
    "service": "ws://127.0.0.1:1082",
    "key": "9{*2gdBSdCrgnSBD",
    "presets": [
      { "name": "ss-base" },
      { "name": "obfs-random-padding" },
      { "name": "ss-stream-cipher", "params": { "method": "aes-128-ctr" } }
    ]
  }
};

const serverJson = {
  "service": "ws://127.0.0.1:1082",
  "key": "9{*2gdBSdCrgnSBD",
  "presets": [
    { "name": "ss-base" },
    { "name": "obfs-random-padding" },
    { "name": "ss-stream-cipher", "params": { "method": "aes-128-ctr" } }
  ]
};

test('transport-layer-ws', async () => await run({ clientJson, serverJson }));
