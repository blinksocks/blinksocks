import run from '../common/run-e2e';

const clientJson = {
  "service": "socks5://127.0.0.1:1081",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "9{*2gdBSdCrgnSBD",
    "presets": [
      { "name": "ss-base" },
      { "name": "obfs-random-padding" },
      { "name": "ss-stream-cipher", "params": { "method": "aes-128-ctr" } }
    ],
    "mux": true,
    "mux_concurrency": 5
  },
  "log_level": "debug"
};

const serverJson = {
  "service": "tcp://127.0.0.1:1082",
  "key": "9{*2gdBSdCrgnSBD",
  "presets": [
    { "name": "ss-base" },
    { "name": "obfs-random-padding" },
    { "name": "ss-stream-cipher", "params": { "method": "aes-128-ctr" } }
  ],
  "mux": true,
  "log_level": "debug"
};

test('multiplexing', async () => await run({ clientJson, serverJson, repeat: 10 }));
