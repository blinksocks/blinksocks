import path from 'path';
import clone from 'lodash.clonedeep';
import run from '../common/run-e2e';

const tlsKey = path.resolve(__dirname, 'resources', 'key.pem');
const tlsCert = path.resolve(__dirname, 'resources', 'cert.pem');

const client = {
  "service": "socks5://127.0.0.1:1081",
  "server": {
    // "service": "tcp://127.0.0.1:1082",
    "key": "9{*2gdBSdCrgnSBD",
    "presets": [
      { "name": "ss-base" },
      { "name": "obfs-random-padding" },
      { "name": "ss-stream-cipher", "params": { "method": "aes-128-ctr" } }
    ],
    "mux": true,
    "mux_concurrency": 5,
    "tls_cert": tlsCert,
  },
  "log_level": "debug"
};

const server = {
  // "service": "tcp://127.0.0.1:1082",
  "key": "9{*2gdBSdCrgnSBD",
  "presets": [
    { "name": "ss-base" },
    { "name": "obfs-random-padding" },
    { "name": "ss-stream-cipher", "params": { "method": "aes-128-ctr" } }
  ],
  "mux": true,
  "tls_cert": tlsCert,
  "tls_key": tlsKey,
  "log_level": "debug"
};

test('multiplexing over tcp', async () => {
  const service = 'tcp://127.0.0.1:1082';

  const clientJson = clone(client);
  const serverJson = clone(server);

  clientJson.server.service = service;
  serverJson.service = service;

  await run({ clientJson, serverJson, repeat: 10 });
});

test('multiplexing over ws', async () => {
  const service = 'ws://127.0.0.1:1082';

  const clientJson = clone(client);
  const serverJson = clone(server);

  clientJson.server.service = service;
  serverJson.service = service;

  await run({ clientJson, serverJson, repeat: 10 });
});

test('multiplexing over tls', async () => {
  const service = 'tls://localhost:1082';

  const clientJson = clone(client);
  const serverJson = clone(server);

  clientJson.server.service = service;
  serverJson.service = service;

  await run({ clientJson, serverJson, repeat: 10 });
});
