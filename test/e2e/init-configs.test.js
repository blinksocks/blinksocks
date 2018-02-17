import run from '../common/run-e2e';

const clientJson = {
  "service": "socks5://127.0.0.1:1081",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "2/tS:7|.-ec.7cxk",
    "presets": [
      { "name": "ss-base" },
      { "name": "obfs-random-padding" },
      { "name": "ss-stream-cipher", "params": { "method": "aes-128-ctr" } }
    ],
    "tls_cert": "cert.pem",
    "mux": false,
    "mux_concurrency": 10
  },
  "dns": [],
  "dns_expire": 3600,
  "timeout": 610,
  "log_path": "bs-client.log",
  "log_level": "info",
  "log_max_days": 30
};

const serverJson = {
  "service": "tcp://127.0.0.1:1082",
  "key": "2/tS:7|.-ec.7cxk",
  "presets": [
    { "name": "ss-base" },
    { "name": "obfs-random-padding" },
    { "name": "ss-stream-cipher", "params": { "method": "aes-128-ctr" } }
  ],
  "tls_key": "key.pem",
  "tls_cert": "cert.pem",
  "mux": false,
  "dns": [],
  "dns_expire": 3600,
  "timeout": 610,
  "redirect": "",
  "log_path": "bs-server.log",
  "log_level": "info",
  "log_max_days": 30
};

test('init-configs', async () => await run({ clientJson, serverJson }));
