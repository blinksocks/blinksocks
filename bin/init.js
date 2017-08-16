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

module.exports = function init({isMinimal}) {
  const key = random('abcdefghjkmnpqrstuvwxyz23456789!@#$%^&*()_+<>?:|{}-=[];,./ABCDEFGHJKLMNPQRSTUVWXYZ', 16);
  const port = getRandomInt(1024, 65535);
  const timeout = getRandomInt(200, 1000);

  const clientJson = {
    'host': '127.0.0.1',
    'port': 1080,
    'servers': [
      {
        'enabled': true,
        'transport': 'tcp',
        'host': 'example.com',
        'port': port,
        'key': key,
        'presets': [
          {
            'name': 'ss-base'
          },
          {
            'name': 'ss-aead-cipher',
            'params': {
              'method': 'aes-256-gcm',
              'info': 'ss-subkey'
            }
          }
        ]
      }
    ],
    'dns': [],
    'dns_expire': 3600,
    'timeout': timeout,
    'workers': 0,
    'log_path': 'bs-client.log',
    'log_level': 'info'
  };

  if (isMinimal) {
    delete clientJson.servers[0].transport;
    delete clientJson.dns;
    delete clientJson.dns_expire;
    delete clientJson.timeout;
    delete clientJson.workers;
    delete clientJson.log_path;
    delete clientJson.log_level;
  }

  const serverJson = {
    'host': '0.0.0.0',
    'port': port,
    'transport': 'tcp',
    'key': key,
    'presets': [
      {
        'name': 'ss-base'
      },
      {
        'name': 'ss-aead-cipher',
        'params': {
          'method': 'aes-256-gcm',
          'info': 'ss-subkey'
        }
      }
    ],
    'dns': [],
    'dns_expire': 3600,
    'redirect': '',
    'timeout': timeout,
    'workers': 0,
    'log_path': 'bs-server.log',
    'log_level': 'info'
  };

  if (isMinimal) {
    delete serverJson.transport;
    delete serverJson.dns;
    delete serverJson.dns_expire;
    delete serverJson.redirect;
    delete serverJson.timeout;
    delete serverJson.workers;
    delete serverJson.log_path;
    delete serverJson.log_level;
  }

  fs.writeFileSync('blinksocks.client.json', JSON.stringify(clientJson, null, '  '));
  fs.writeFileSync('blinksocks.server.json', JSON.stringify(serverJson, null, '  '));

  console.log('> Generated blinksocks.client.json and blinksocks.server.json');
  console.log('> Check out https://github.com/blinksocks/blinksocks/tree/master/docs/config for explanation to each option');
};
