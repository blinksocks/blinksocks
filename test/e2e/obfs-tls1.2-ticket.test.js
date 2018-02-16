import run from '../common/run-e2e';

const clientJson = {
  "service": "socks5://127.0.0.1:1081",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "9{*2gdBSdCrgnSBD",
    "presets": [
      {"name": "ss-base"},
      {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com", "example.com"]}}
    ]
  }
};

const serverJson = {
  "service": "tcp://127.0.0.1:1082",
  "key": "9{*2gdBSdCrgnSBD",
  "presets": [
    {"name": "ss-base"},
    {"name": "obfs-tls1.2-ticket"}
  ]
};

test('obfs-tls1.2-ticket', async () => await run({clientJson, serverJson}));
