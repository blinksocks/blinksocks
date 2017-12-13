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
  return Math.floor(crypto.randomBytes(1)[0] / 0xff * (max - min)) + min;
}

module.exports = function init({isMinimal, isOverwrite}) {
  const key = random('abcdefghjkmnpqrstuvwxyz23456789!@#$%^&*()_+<>?:|{}-=[];,./ABCDEFGHJKLMNPQRSTUVWXYZ', 16);
  const port = getRandomInt(1024, 65535);
  const timeout = getRandomInt(200, 1000);

  const clientJson = {
    'service': 'socks5://127.0.0.1:1080',
    'servers': [
      {
        'enabled': true,
        'service': `tcp://127.0.0.1:${port}`,
        'key': key,
        'presets': [
          {'name': 'ss-base'},
          {'name': 'obfs-random-padding'},
          {'name': 'ss-stream-cipher', 'params': {'method': 'aes-128-ctr'}}
        ],
        'tls_cert': 'cert.pem'
      }
    ],
    'dns': [],
    'dns_expire': 3600,
    'timeout': timeout,
    'workers': 0,
    'log_path': 'bs-client.log',
    'log_level': 'info',
    'log_max_days': 30
  };

  if (isMinimal) {
    delete clientJson.servers[0].tls_cert;
    delete clientJson.dns;
    delete clientJson.dns_expire;
    delete clientJson.timeout;
    delete clientJson.workers;
    delete clientJson.log_path;
    delete clientJson.log_level;
    delete clientJson.log_max_days;
  }

  const serverJson = {
    'service': `tcp://0.0.0.0:${port}`,
    'key': key,
    'presets': [
      {'name': 'ss-base'},
      {'name': 'obfs-random-padding'},
      {'name': 'ss-stream-cipher', 'params': {'method': 'aes-128-ctr'}}
    ],
    'tls_key': 'key.pem',
    'tls_cert': 'cert.pem',
    'dns': [],
    'dns_expire': 3600,
    'timeout': timeout,
    'redirect': '',
    'workers': 0,
    'log_path': 'bs-server.log',
    'log_level': 'info',
    'log_max_days': 30
  };

  if (isMinimal) {
    delete serverJson.tls_key;
    delete serverJson.tls_cert;
    delete serverJson.dns;
    delete serverJson.dns_expire;
    delete serverJson.timeout;
    delete serverJson.redirect;
    delete serverJson.workers;
    delete serverJson.log_path;
    delete serverJson.log_level;
    delete serverJson.log_max_days;
  }

  const clientJsonPath = 'blinksocks.client.json';
  const serverJsonPath = 'blinksocks.server.json';

  if (fs.existsSync(clientJsonPath) && !isOverwrite) {
    console.log(`> File ${clientJsonPath} exist, skip. Use "-w" to overwrite.`);
  } else {
    fs.writeFileSync(clientJsonPath, JSON.stringify(clientJson, null, '  '));
  }

  if (fs.existsSync(serverJsonPath) && !isOverwrite) {
    console.log(`> File ${serverJsonPath} exist, skip. Use "-w" to overwrite.`);
  } else {
    fs.writeFileSync(serverJsonPath, JSON.stringify(serverJson, null, '  '));
  }

  console.log('> Generate Done, for help please refer to:');
  console.log('> https://github.com/blinksocks/blinksocks/tree/master/docs/config/README.md');
};
