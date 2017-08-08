#!/usr/bin/env node

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

const key = random('abcdefghjklmnpqrstuvwxyz23456789!@#$%^&*()_+<>?:|{}-=[];,./ABCDEFGHJKLMNPQRSTUVWXYZ', 16);

const clientJs = `{
  "host": "localhost",
  "port": 1080,
  "servers": [
    {
      "enabled": true,
      "transport": "tcp",
      "host": "example.com",
      "port": 4321,
      "key": "${key}",
      "presets": [
        {
          "name": "ss-base",
          "params": {}
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
  "timeout": 600,
  "profile": false,
  "watch": false,
  "log_level": "info"
}`;

const serverJs = `{
  "host": "0.0.0.0",
  "port": 4321,
  "transport": "tcp",
  "key": "${key}",
  "presets": [
    {
      "name": "ss-base",
      "params": {}
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
  "timeout": 600,
  "profile": false,
  "watch": false,
  "log_level": "info"
}`;

fs.writeFileSync('blinksocks.client.json', clientJs);
fs.writeFileSync('blinksocks.server.json', serverJs);

console.log('> Generated blinksocks.client.json and blinksocks.server.json');
console.log('> For explanation to each option, please refer to docs/config/README.md');
