/* eslint-disable quotes */
const fs = require('fs');
const crypto = require('crypto');

/**
 * return a fixed length random string from array
 * @param array
 * @param len
 * @returns {string}
 */
function random(array, len) {
  const size = array.length;
  const randomIndexes = crypto.randomBytes(len).toJSON().data;
  return randomIndexes.map((char) => array[char % size]).join('');
}

/**
 * returns a random integer in [min, max].
 * @param min
 * @param max
 * @returns {Number}
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.ceil(max);
  return Math.floor(crypto.randomBytes(1)[0] / 0xff * (max - min + 1)) + min;
}

module.exports = function init() {
  const key = random('abcdefghjkmnpqrstuvwxyz23456789!@#$%^&*()_+<>?:|{}-=[];,./ABCDEFGHJKLMNPQRSTUVWXYZ', 16);
  const port = getRandomInt(1024, 65535);
  const timeout = getRandomInt(200, 1000);

  const clientJs = `{
  "host": "127.0.0.1",
  "port": 1080,
  "servers": [
    {
      "enabled": true,
      "transport": "tcp",
      "host": "example.com",
      "port": ${port},
      "key": "${key}",
      "presets": [
        {
          "name": "ss-base"
        },
        {
          "name": "ss-aead-cipher",
          "params": {
            "method": "aes-256-gcm",
            "info": "ss-subkey"
          }
        }
      ]
    }
  ],
  "dns": [],
  "dns_expire": 3600,
  "timeout": ${timeout},
  "profile": false,
  "watch": false,
  "log_level": "info"
}`;

  const serverJs = `{
  "host": "0.0.0.0",
  "port": ${port},
  "transport": "tcp",
  "key": "${key}",
  "presets": [
    {
      "name": "ss-base"
    },
    {
      "name": "ss-aead-cipher",
      "params": {
        "method": "aes-256-gcm",
        "info": "ss-subkey"
      }
    }
  ],
  "dns": [],
  "dns_expire": 3600,
  "redirect": "",
  "timeout": ${timeout},
  "profile": false,
  "watch": false,
  "log_level": "info"
}`;

  fs.writeFileSync('blinksocks.client.json', clientJs);
  fs.writeFileSync('blinksocks.server.json', serverJs);

  console.log('> Generated blinksocks.client.json and blinksocks.server.json');
  console.log('> For explanation to each option, please refer to docs/config/README.md');
};
