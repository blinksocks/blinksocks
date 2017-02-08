import fs from 'fs';
import readline from 'readline';
import crypto from 'crypto';
import {IObfs} from './interface';

class Faker {

  static _fakes = [
    // {
    //   'request': <Buffer>,
    //   'response': <Buffer>
    // },
    // ...
  ];

  static _parse(file, callback) {
    if (this._fakes.length > 0) {
      callback(this._fakes);
      return;
    }
    try {
      const parts = [];
      let part = '';
      const rl = readline.createInterface({input: fs.createReadStream(file)});
      rl.on('line', function (line) {
        switch (line[0]) {
          case '=':
          case '-':
            if (part !== '') {
              part += '\r\n';
              parts.push(part);
              part = '';
            }
            break;
          default:
            part += line;
            part += '\r\n';
            break;
        }
      });
      rl.on('close', () => {
        for (let i = 0; i < parts.length; i += 2) {
          const prev = parts[i];
          const next = parts[i + 1];
          this._fakes.push({
            request: Buffer.from(prev),
            response: Buffer.from(next)
          });
        }
        callback(this._fakes);
      });
    } catch (err) {
      throw err;
    }
  }

  static get(file, callback) {
    this._parse(file, callback);
  }

}

/**
 * @description
 *   wrap packet with pre-shared HTTP header
 *
 * @params
 *   file (String): A text file which contains several HTTP header paris.
 *   [times = 0] (Number): Times that the obfs takes effect. If negative number was given, means always.
 *
 * @examples
 *   "obfs_params": "http-fake.txt"      // never
 *   "obfs_params": "http-fake.txt,0"    // never
 *   "obfs_params": "http-fake.txt,1"    // one-off per socket
 *   "obfs_params": "http-fake.txt,10"   // 10 times per socket
 *   "obfs_params": "http-fake.txt,-1"   // always per socket
 */
export default class HttpObfs extends IObfs {

  _file = null;

  _times = 0;

  _response = null;

  constructor(props) {
    super(props);
    const params = props.obfs_params.split(',').filter((param) => param.length > 0);
    if (params.length < 1) {
      throw Error(`'obfs_params' requires at least one parameter.`);
    }
    if (params.length > 1) {
      const times = parseInt(params[1], 10);
      if (!Number.isSafeInteger(times)) {
        throw Error('the second parameter must be a number.');
      }
      this._times = times;
    }
    this._file = params[0];
  }

  forwardToServer(buffer, next) {
    if (this._times < 0 || this._times > 0) {
      this._times--;
      Faker.get(this._file, (fakes) => {
        const index = crypto.randomBytes(1)[0] % fakes.length;
        const {request} = fakes[index];
        next(Buffer.concat([request, buffer]));
      });
    } else {
      return buffer;
    }
  }

  forwardToDst(buffer, next) {
    if (this._times < 0 || this._times > 0) {
      this._times--;
      Faker.get(this._file, (fakes) => {
        const found = fakes.find(
          ({request}) => buffer.indexOf(request) === 0
        );
        if (typeof found !== 'undefined') {
          this._response = found.response;
          next(buffer.slice(found.request.length));
        } else {
          throw Error(`unrecognized obfs header: '${buffer.slice(0, 100).toString()}...'`);
        }
      });
    } else {
      return buffer;
    }
  }

  backwardToClient(buffer) {
    if (this._times < 0 || this._times > 0) {
      this._times--;
      return Buffer.concat([this._response, buffer]);
    } else {
      return buffer;
    }
  }

  backwardToApplication(buffer, next) {
    if (this._times < 0 || this._times > 0) {
      this._times--;
      Faker.get(this._file, (fakes) => {
        const found = fakes.find(
          ({response}) => buffer.indexOf(response) === 0
        );
        if (typeof found !== 'undefined') {
          next(buffer.slice(found.response.length));
        } else {
          throw Error(`unrecognized obfs header: '${buffer.slice(0, 100).toString()}'`);
        }
      });
    } else {
      return buffer;
    }
  }

}
