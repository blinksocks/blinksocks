import fs from 'fs';
import readline from 'readline';
import crypto from 'crypto';
import {IObfs} from './interface';

const HTTP_OBFS_PARAMS_LEN = 2;
const HTTP_OBFS_MODE_ONE_OFF = 'one-off';
const HTTP_OBFS_MODE_PERSIST = 'persist';
const HTTP_OBFS_MODES = [HTTP_OBFS_MODE_ONE_OFF, HTTP_OBFS_MODE_PERSIST];

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

export default class HttpObfs extends IObfs {

  _file = null;

  _mode = null;

  _response = null;

  constructor(props) {
    super(props);
    const params = props.obfs_params.split(',').filter((param) => param.length > 0);
    if (params.length !== HTTP_OBFS_PARAMS_LEN) {
      throw Error(`'obfs_params' requires two params, but ${params.length} was/were given.`);
    }
    const [file, mode] = params;
    // mode
    if (!HTTP_OBFS_MODES.includes(mode)) {
      throw Error(`the second param must be one of ${HTTP_OBFS_MODES}, but ${mode} was given.`);
    }
    this._file = file;
    this._mode = mode;
  }

  forwardToServer(buffer, next) {
    Faker.get(this._file, (fakes) => {
      const index = crypto.randomBytes(1)[0] % fakes.length;
      const {request} = fakes[index];
      next(Buffer.concat([request, buffer]));
    });
  }

  forwardToDst(buffer, next) {
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
  }

  backwardToClient(buffer) {
    return Buffer.concat([this._response, buffer]);
  }

  backwardToApplication(buffer, next) {
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
  }

}
