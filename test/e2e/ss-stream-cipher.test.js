import clone from 'lodash.clonedeep';
import run from '../common/run-e2e';

const client = {
  "service": "socks5://127.0.0.1:1081",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "9{*2gdBSdCrgnSBD",
    "presets": [
      {"name": "ss-base"}
    ]
  }
};

const server = {
  "service": "tcp://127.0.0.1:1082",
  "key": "9{*2gdBSdCrgnSBD",
  "presets": [
    {"name": "ss-base"}
  ]
};

test('ss-stream-cipher, aes-256-cfb', async () => {
  const cipher = {"name": "ss-stream-cipher", "params": {"method": "aes-256-cfb"}};

  const clientJson = clone(client);
  const serverJson = clone(server);

  clientJson.server.presets.push(cipher);
  serverJson.presets.push(cipher);

  await run({clientJson, serverJson});
});

test('ss-stream-cipher, rc4-md5', async () => {
  const cipher = {"name": "ss-stream-cipher", "params": {"method": "rc4-md5"}};

  const clientJson = clone(client);
  const serverJson = clone(server);

  clientJson.server.presets.push(cipher);
  serverJson.presets.push(cipher);

  await run({clientJson, serverJson});
});

test('ss-stream-cipher, rc4-md5-6', async () => {
  const cipher = {"name": "ss-stream-cipher", "params": {"method": "rc4-md5-6"}};

  const clientJson = clone(client);
  const serverJson = clone(server);

  clientJson.server.presets.push(cipher);
  serverJson.presets.push(cipher);

  await run({clientJson, serverJson});
});
