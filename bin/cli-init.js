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

const clientJs = `module.exports = {

  // local hostname or ip address
  // For client, act as a Socks5/Socks4/HTTP server.
  // For server, act as a blinksocks server.
  host: "localhost",

  // local port to be listen on
  port: 1080,

  // a list of blinksocks/shadowsocks server(client side only)
  servers: [
    {
      // allow to use this server or not
      enabled: true,

      // the transport layer, "tcp" or "udp"
      transport: 'tcp',

      // server host name or ip address
      host: "example.com",

      // server port
      port: 5678,

      // a secret key for encryption/description
      key: "${key}",

      // presets to process data stream
      // DO NOT modify the first preset if you don't know what it is.
      // Take care the order of those presets, read the docs before changing them.
      presets: [
        {
          // preset name
          name: "ss-base",

          // preset parameters
          params: {}
        },
        {
          name: "ss-aead-cipher",
          params: {
            method: "aes-256-gcm",
            info: "ss-subkey"
          }
        }
      ]
    }
  ],

  // an ip list of DNS server
  dns: [],

  // close inactive connection after timeout seconds
  timeout: 600,

  // collect performance statistics
  profile: false,

  // hot-reload when this file changed
  watch: true,

  // log at the level, "error", "warn", "info", "verbose", "debug" or "silly"
  log_level: "info"

};
`;

const serverJs = `module.exports = {

  // local hostname or ip address
  // For client, act as a Socks5/Socks4/HTTP server.
  // For server, act as a blinksocks server.
  host: "0.0.0.0",

  // local port to be listen on
  port: 5678,

  // the transport layer, "tcp" or "udp"
  transport: 'tcp',

  // a secret key for encryption/description
  key: "${key}",

  // presets to process data stream
  // DO NOT modify the first preset if you don't know what it is.
  // Take care the order of those presets, read the docs before changing them.
  presets: [
    {
      // preset name
      name: "ss-base",

      // preset parameters
      params: {}
    },
    {
      name: "ss-aead-cipher",
      params: {
        method: "aes-256-gcm",
        info: "ss-subkey"
      }
    }
  ],

  // an ip list of DNS server
  dns: [],

  // redirect data to here once preset fail to process(server side only)
  // Should be formed with "host:port".
  redirect: "",

  // close inactive connection after timeout seconds
  timeout: 600,

  // collect performance statistics
  profile: false,

  // hot-reload when this file changed
  watch: true,

  // log at the level, "error", "warn", "info", "verbose", "debug" or "silly"
  log_level: "info"

};
`;

fs.writeFileSync('blinksocks.client.js', clientJs);
fs.writeFileSync('blinksocks.server.js', serverJs);
