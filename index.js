import fs from 'fs';
import path from 'path';
import {Config} from './src/classes/Config';
import {Crypto} from './src/classes/Crypto';
import {Tracer} from './src/classes/Tracer';
import {AdvancedBuffer} from './src/classes/AdvancedBuffer';

function hash(buffer) {
  return Crypto.hash(buffer).slice(0, 6);
}

Config.init({
  "host": "localhost",
  "port": 6666,
  "server_host": "localhost",
  "server_port": 7777,
  "password": "my secret password",
  "cipher": "aes-256-cfb"
});

const seg_1 = fs.readFileSync(path.resolve(__dirname, './1440-Relay_1_en-10:49:15.591'));
const seg_2 = fs.readFileSync(path.resolve(__dirname, './671-Relay_1_en-10:49:15.811'));

const concated = Buffer.concat([seg_1, seg_2]);
console.log(`True: len=${concated.length},hash=${hash(Crypto.decrypt(concated))}`);
Tracer.dump('true', Crypto.decrypt(concated));
// ======

const buffer = new AdvancedBuffer();
buffer.on('data', function (data) {
  console.log(`False: len=${data.length},hash=${hash(data)}`);
  Tracer.dump('false', data);
});
buffer.put(Crypto.decrypt(seg_1));
buffer.put(Crypto.decrypt(seg_2));
