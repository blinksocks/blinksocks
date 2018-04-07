import format from 'filesize';
import { logger } from '../utils';
import { PIPE_ENCODE } from '../constants';

const TRACK_CHAR_UPLOAD = 'u';
const TRACK_CHAR_DOWNLOAD = 'd';
const TRACK_MAX_SIZE = 60;

/**
 * @description
 *   Track data send/receive events, and print a part of them once connection closed.
 *
 *   +---+-----------------------+---+
 *   | C | d <--> u     u <--> d | S |
 *   +---+-----------------------+---+
 *
 */
export class Tracker {

  // ['source', 'target', 'u', '20', 'u', '20', 'd', '10', ...]
  _tracks = [];

  _config;
  _transport;

  _sourceHost;
  _sourcePort;

  _targetHost;
  _targetPort;

  constructor({ config, transport }) {
    this._config = config;
    this._transport = transport;
  }

  setSourceAddress(host, port) {
    if (host !== this._sourceHost && port !== this._sourcePort) {
      this._sourceHost = host;
      this._sourcePort = port;
      this._tracks.push(`${host}:${port}`);
    }
  }

  setTargetAddress(host, port) {
    if (host !== this._targetHost && port !== this._targetPort) {
      this._targetHost = host;
      this._targetPort = port;
      this._tracks.push(`${host}:${port}`);
    }
  }

  trace(type, size) {
    if (type === PIPE_ENCODE) {
      this._tracks.push(TRACK_CHAR_UPLOAD);
      this._tracks.push(size);
    } else {
      this._tracks.push(TRACK_CHAR_DOWNLOAD);
      this._tracks.push(size);
    }
  }

  destroy() {
    if (this._tracks !== null) {
      this._finish();
    }
    this._tracks = null;
  }

  /**
   * print connection track string, and only display the
   * leading and the trailing TRACK_MAX_SIZE / 2
   */
  _finish() {
    let strs = [];
    let dp = 0, db = 0;
    let up = 0, ub = 0;
    let ud = '';
    for (const el of this._tracks) {
      if (el === TRACK_CHAR_UPLOAD || el === TRACK_CHAR_DOWNLOAD) {
        if (ud === el) {
          continue;
        }
        ud = el;
      }
      if (Number.isInteger(el)) {
        if (ud === TRACK_CHAR_DOWNLOAD) {
          dp += 1;
          db += el;
        }
        if (ud === TRACK_CHAR_UPLOAD) {
          up += 1;
          ub += el;
        }
      }
      strs.push(el);
    }
    const perSize = Math.floor(TRACK_MAX_SIZE / 2);
    if (strs.length > TRACK_MAX_SIZE) {
      strs = strs.slice(0, perSize).concat([' ... ']).concat(strs.slice(-perSize));
    }
    db = format(db, { output: 'array' }).join('');
    ub = format(ub, { output: 'array' }).join('');
    const summary = this._config.is_client ? `out/in = ${up}/${dp}, ${ub}/${db}` : `in/out = ${dp}/${up}, ${db}/${ub}`;
    logger.info(`[tracker:${this._transport}] summary(${summary}) abstract(${strs.join(' ')})`);
  }

}
