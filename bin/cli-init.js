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

const key = random('abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+<>?:|{}-=[];,./ABCDEFGHIJKLMNOPQRSTUVWXYZ', 16);

const js = `module.exports = {

  /**
   * local hostname or ip address
   *
   * @note
   *   1. For client, act as a Socks5/Socks4/HTTP server.
   *   2. For server, act as a blinksocks server.
   */
  "host": "localhost",

  /**
   * local port to be listen on
   */
  "port": 5555,

  /**
   * a list of blinksocks/shadowsocks server
   *
   * @note
   *   1. You can disable an item by prefixing a '-'.
   *   2. Optional, used only on CLIENT.
   *   3. Each item should be formed with "host:port".
   */
  "servers": [
    
  ],

  /**
   * a secret key for encryption/description
   */
  "key": "${key}",

  /**
   * presets to process data stream
   *
   * @note
   *   1. DO NOT modify the first preset if you don't know what it is.
   *   2. Take care the order of those presets, read the docs before changing them.
   */
  "presets": [
    {
      // preset name
      "name": "ss-base",
      // preset parameters
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

  /**
   * redirect data stream to here once preset fail to process
   *
   * @note
   *   1. should be formed with "host:port".
   */
  "redirect": "",

  /**
   * close inactive connection after timeout seconds
   */
  "timeout": 600,

  /**
   * collect performance statistics
   */
  "profile": false,

  /**
   * hot-reload when this file changed
   */
  "watch": true,

  /**
   * log by the level
   *
   * @note
   *   1. should be one of [error, warn, info, verbose, debug, silly]
   */
  "log_level": "info"

};`;

const file = 'blinksocks.config.js';

fs.writeFileSync(file, js);
