import fs from 'fs';
import path from 'path';
import log4js from 'log4js';
import {Config} from '../Config';

const Logger = log4js.getLogger('Tracer');

function root(dir) {
  if (Config.isServer) {
    return path.resolve(__dirname, '../../../debug/server', dir);
  } else {
    return path.resolve(__dirname, '../../../debug/client', dir);
  }
}

export class Tracer {

  static dump(description, buffer) {
    Logger.setLevel(Config.log_level);
    const date = new Date();
    const timestamp = [
      `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}`
    ].join('');
    const filename = `${buffer.length}-${description}-${timestamp}`;
    fs.writeFile(root(filename), buffer, (err) => {
      if (err) {
        Logger.error(err);
      }
    });
  }

}
