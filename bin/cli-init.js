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

const json = {
  "host": "localhost",
  "port": 1080,
  "servers": [],
  "key": getRandomString(16),
  "frame": "origin",
  "frame_params": "",
  "crypto": "",
  "crypto_params": "",
  "protocol": "aead",
  "protocol_params": "aes-256-cbc,sha256",
  "obfs": "",
  "obfs_params": "",
  "log_level": "info"
};

const file = 'blinksocks.json';

const data = JSON.stringify(json, null, '  ');
fs.writeFile(file, data, function (err) {
  if (err) {
    throw err;
  }
});
