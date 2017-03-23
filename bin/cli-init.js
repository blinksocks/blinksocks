#!/usr/bin/env node

/* eslint-disable quotes */
const fs = require('fs');
const crypto = require('crypto');

/**
 * return random human readable string
 * @returns {string}
 */
function getRandomString(len) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+<>?:|{}ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const size = chars.length;
  return crypto.randomBytes(len)
    .toJSON()
    .data
    .map((char) => chars[char % size])
    .join('');
}

const commonJson = {
  "host": "localhost",
  "port": 1080,
  "key": getRandomString(16),
  "frame": "origin",
  "frame_params": "",
  "crypto": "",
  "crypto_params": "",
  "protocol": "aead",
  "protocol_params": "aes-256-cbc,sha256",
  "obfs": "",
  "obfs_params": "",
  "log_level": "error"
};

const files = [
  'blinksocks.server.json',
  'blinksocks.client.json'
];

Promise.all(
  files.map((file, i) => new Promise((resolve) => {
    const jsonData = JSON.stringify(
      (i === 0) ? commonJson : Object.assign({}, {'servers': ['']}, commonJson),
      null,
      '  '
    );
    fs.writeFile(file, jsonData, function (err) {
      if (err) {
        throw err;
      }
      resolve();
    });
  }))
)
  .then(() => {
    console.log('configurations are saved at:');
    files.forEach((f) => console.log(f));
  })
  .catch((err) => console.error(err));
