import clone from 'lodash.clonedeep';
import run from '../common/run-e2e';

const client = {
  "service": "socks5://127.0.0.1:1081",
  "server": {
    "service": "tcp://127.0.0.1:1082",
    "key": "9{*2gdBSdCrgnSBD",
    "presets": [
      { "name": "ss-base" }
    ]
  }
};

const server = {
  "service": "tcp://127.0.0.1:1082",
  "key": "9{*2gdBSdCrgnSBD",
  "presets": [
    { "name": "ss-base" }
  ]
};

test('ss-aead-cipher, aes-128-gcm', async () => {
  const cipher = { "name": "ss-aead-cipher", "params": { "method": "aes-128-gcm" } };

  const clientJson = clone(client);
  const serverJson = clone(server);

  clientJson.server.presets.push(cipher);
  serverJson.presets.push(cipher);

  await run({ clientJson, serverJson });
});

test('ss-aead-cipher, chacha20-ietf-poly1305', async () => {
  const cipher = { "name": "ss-aead-cipher", "params": { "method": "chacha20-ietf-poly1305" } };

  const clientJson = clone(client);
  const serverJson = clone(server);

  clientJson.server.presets.push(cipher);
  serverJson.presets.push(cipher);

  await run({ clientJson, serverJson });
});

test('ss-aead-cipher, xchacha20-ietf-poly1305', async () => {
  const cipher = { "name": "ss-aead-cipher", "params": { "method": "xchacha20-ietf-poly1305" } };

  const clientJson = clone(client);
  const serverJson = clone(server);

  clientJson.server.presets.push(cipher);
  serverJson.presets.push(cipher);

  await run({ clientJson, serverJson });
});
