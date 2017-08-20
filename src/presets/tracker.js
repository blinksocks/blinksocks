import {IPreset, CONNECTION_CREATED, SOCKET_CONNECT_TO_REMOTE, CONNECTION_CLOSED} from './defs';
import {logger} from '../utils';

const TRACK_CHAR_UPLOAD = 'u';
const TRACK_CHAR_DOWNLOAD = 'd';
const TRACK_MAX_SIZE = 40;

// +---+-----------------------+---+
// | C | d <--> u     u <--> d | S |
// +---+-----------------------+---+
export default class TrackerPreset extends IPreset {

  // ['source', 'target', 'u', '20', 'u', '20', 'd', '10', ...]
  _tracks = [];

  onNotified({type, payload}) {
    switch (type) {
      case CONNECTION_CREATED:
      case SOCKET_CONNECT_TO_REMOTE:
        const {host, port} = payload;
        this._tracks.push(`${host}:${port}`);
        break;
      case CONNECTION_CLOSED:
        this.dump();
        this._tracks = [];
        break;
      default:
        break;
    }
  }

  beforeOut({buffer}) {
    this._tracks.push(TRACK_CHAR_UPLOAD);
    this._tracks.push(buffer.length);
    return buffer;
  }

  beforeIn({buffer}) {
    this._tracks.push(TRACK_CHAR_DOWNLOAD);
    this._tracks.push(buffer.length);
    return buffer;
  }

  /**
   * print connection track string, and only display the
   * leading and the trailing TRACK_MAX_SIZE / 2
   */
  dump() {
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
    const summary = __IS_CLIENT__ ? `out/in = ${up}/${dp}, ${ub}b/${db}b` : `in/out = ${dp}/${up}, ${db}b/${ub}b`;
    logger.info(`[tracker] summary(${summary}) abstract(${strs.join(' ')})`);
  }

}
