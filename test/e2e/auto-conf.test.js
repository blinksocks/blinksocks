import path from 'path';
import run from '../common/run-e2e';

const suites = path.resolve(__dirname, 'resources', 'auto-conf-suites.json');

const clientJson = {
  "service": "socks5://127.0.0.1:1081",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "9{*2gdBSdCrgnSBD",
    "presets": [
      {"name": "auto-conf", "params": {"suites": suites}},
    ]
  }
};

const serverJson = {
  "service": "tcp://127.0.0.1:1082",
  "key": "9{*2gdBSdCrgnSBD",
  "presets": [
    {"name": "auto-conf", "params": {"suites": suites}},
  ]
};

test('auto-conf', async () => await run({clientJson, serverJson, repeat: 5}));
