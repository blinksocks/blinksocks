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

const json = {
  "host": "localhost",
  "port": 1080,
  "servers": [],
  "key": random('abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+<>?:|{}ABCDEFGHIJKLMNOPQRSTUVWXYZ', 16),
  "frame": "origin",
  "frame_params": "",
  "crypto": "",
  "crypto_params": "",
  "protocol": "ss-aead",
  "protocol_params": "aes-256-gcm,ss-subkey",
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
