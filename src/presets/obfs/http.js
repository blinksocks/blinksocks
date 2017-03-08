import fs from 'fs';
import readline from 'readline';
import crypto from 'crypto';
import {IPreset} from '../interface';

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
  }

  static get(file, callback) {
    this._parse(file, callback);
  }

}

/**
 * @description
 *   Wrap packet with pre-shared HTTP header.
 *
 * @params
 *   file (String): A text file which contains several HTTP header paris.
 *
 * @examples
 *   "obfs": "http"
 *   "obfs_params": "http-fake.txt"
 *
 * @protocol
 *
 *   # TCP handshake
 *   +-----------+----------------------------+
 *   | obfs.DATA |          PAYLOAD           |
 *   +-----------+----------------------------+
 *   | Variable  |         Variable           |
 *   +-----------+----------------------------+
 *
 *   # TCP chunk
 *   +----------------------------+
 *   |          PAYLOAD           |
 *   +----------------------------+
 *   |         Variable           |
 *   +----------------------------+
 */
export default class HttpObfs extends IPreset {

  _isHandshakeDone = false;

  _file = null;

  _response = null;

  constructor(file) {
    super();
    if (typeof file === 'undefined') {
      throw Error('\'obfs_params\' requires at least one parameter.');
    }
    this._file = file;
  }

  clientOut({buffer, next}) {
    if (this._isHandshakeDone) {
      return buffer;
    } else {
      Faker.get(this._file, (fakes) => {
        const index = crypto.randomBytes(1)[0] % fakes.length;
        const {request} = fakes[index];
        next(Buffer.concat([request, buffer]));
      });
    }
  }

  serverIn({buffer, next, fail}) {
    if (this._isHandshakeDone) {
      return buffer;
    } else {
      Faker.get(this._file, (fakes) => {
        const found = fakes.find(
          ({request}) => buffer.indexOf(request) === 0
        );
        if (typeof found !== 'undefined') {
          this._response = found.response;
          next(buffer.slice(found.request.length));
        } else {
          fail('obfs header mismatch');
        }
      });
    }
  }

  serverOut({buffer}) {
    if (this._isHandshakeDone) {
      return buffer;
    } else {
      this._isHandshakeDone = true;
      return Buffer.concat([this._response, buffer]);
    }
  }

  clientIn({buffer, next, fail}) {
    if (this._isHandshakeDone) {
      return buffer;
    } else {
      Faker.get(this._file, (fakes) => {
        const found = fakes.find(
          ({response}) => buffer.indexOf(response) === 0
        );
        if (typeof found !== 'undefined') {
          next(buffer.slice(found.response.length));
        } else {
          fail('obfs header mismatch');
        }
      });
      this._isHandshakeDone = true;
    }
  }

}
