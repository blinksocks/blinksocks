import fs from 'fs';
import crypto from 'crypto';
import { IPreset } from './defs';

/**
 * parse text file into {request: response} pairs
 * @param file
 * @returns {Array}
 */
function parseFile(file) {
  const txt = fs.readFileSync(file, { encoding: 'utf-8' });
  const lines = txt.split(/\r\n|\n|\r/);
  const parts = [];
  let part = '';
  for (const line of lines) {
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
  }
  const pairs = [];
  for (let i = 0; i < parts.length; i += 2) {
    const prev = parts[i];
    const next = parts[i + 1];
    pairs.push({
      request: Buffer.from(prev),
      response: Buffer.from(next)
    });
  }
  return pairs;
}

/**
 * @description
 *   Wrap packet with pre-shared HTTP header in the first request/response.
 *
 * @params
 *   file: A text file which contains several HTTP header paris.
 *
 * @examples
 *   {
 *     "name": "obfs-http",
 *     "params": {
 *       "file": "http-fake.txt"
 *     }
 *   }
 *
 * @protocol
 *
 *   C ---- [http header][data] ---> S
 *   C <---------- [data] ---------> S
 *
 */
export default class ObfsHttpPreset extends IPreset {

  _isHeaderSent = false;

  _isHeaderRecv = false;

  _response = null;

  static onCheckParams({ file }) {
    if (typeof file !== 'string' || file === '') {
      throw Error('\'file\' must be a non-empty string');
    }
  }

  static onCache({ file }) {
    return {
      pairs: parseFile(file),
    };
  }

  onDestroy() {
    this._response = null;
  }

  clientOut({ buffer }) {
    if (!this._isHeaderSent) {
      const { pairs } = this.getStore();
      this._isHeaderSent = true;
      const index = crypto.randomBytes(1)[0] % pairs.length;
      const { request } = pairs[index];
      return Buffer.concat([request, buffer]);
    } else {
      return buffer;
    }
  }

  serverIn({ buffer, fail }) {
    if (!this._isHeaderRecv) {
      const found = this.getStore().pairs.find(({ request }) => buffer.indexOf(request) === 0);
      if (found !== undefined) {
        this._isHeaderRecv = true;
        this._response = found.response;
        return buffer.slice(found.request.length);
      } else {
        return fail('http header mismatch');
      }
    } else {
      return buffer;
    }
  }

  serverOut({ buffer }) {
    if (!this._isHeaderSent) {
      this._isHeaderSent = true;
      return Buffer.concat([this._response, buffer]);
    } else {
      return buffer;
    }
  }

  clientIn({ buffer, fail }) {
    if (!this._isHeaderRecv) {
      const found = this.getStore().pairs.find(({ response }) => buffer.indexOf(response) === 0);
      if (found !== undefined) {
        this._isHeaderRecv = true;
        return buffer.slice(found.response.length);
      } else {
        return fail('http header mismatch');
      }
    } else {
      return buffer;
    }
  }

}
