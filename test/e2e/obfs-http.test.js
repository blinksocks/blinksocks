import path from 'path';
import run from '../common/run-e2e';

const mockfile = path.resolve(__dirname, 'resources', 'http-mock.txt');

const clientJson = {
  "service": "socks5://127.0.0.1:1081",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "9{*2gdBSdCrgnSBD",
    "presets": [
      {"name": "ss-base"},
      {"name": "obfs-http", "params": {"file": mockfile}}
    ]
  }
};

const serverJson = {
  "service": "tcp://127.0.0.1:1082",
  "key": "9{*2gdBSdCrgnSBD",
  "presets": [
    {"name": "ss-base"},
    {"name": "obfs-http", "params": {"file": mockfile}}
  ]
};

test('obfs-http', async () => await run({clientJson, serverJson, repeat: 5}));
