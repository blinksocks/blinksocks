import {getRandomInt, Logger} from '../utils';

const DEFAULT_TIMEOUT_MIN = 10;
const DEFAULT_TIMEOUT_MAX = 40;

let logger = null;

export default class RandomTimeoutBehaviour {

  min = DEFAULT_TIMEOUT_MIN;

  max = DEFAULT_TIMEOUT_MAX;

  constructor({min, max}) {
    logger = Logger.getInstance();
    if (min !== undefined && !Number.isInteger(min)) {
      if (!Number.isInteger(min)) {
        throw Error('\'min\' must be an integer');
      }
      if (min < 0) {
        throw Error('\'min\' must be greater than 0');
      }
    }
    if (max !== undefined && !Number.isInteger(max)) {
      if (!Number.isInteger(max)) {
        throw Error('\'max\' must be an integer');
      }
      if (max < 0) {
        throw Error('\'max\' must be greater than 0');
      }
    }
    if (min !== undefined && max !== undefined && min > max) {
      throw Error('\'max\' must be greater than or equal to \'min\'');
    }
    this.min = min !== undefined ? min : DEFAULT_TIMEOUT_MIN;
    this.max = max !== undefined ? max : DEFAULT_TIMEOUT_MAX;
  }

  async run({remoteAddr, bsocket, fsocket}) {
    const timeout = getRandomInt(this.min, this.max);
    logger.warn(`[behaviour] [${remoteAddr}] connection will be closed in ${timeout}s...`);
    return new Promise((resolve) => {
      bsocket && bsocket.pause();
      fsocket && fsocket.pause();
      setTimeout(() => {
        if (bsocket !== null && !bsocket.destroyed) {
          bsocket.destroy();
        }
        if (fsocket !== null && !fsocket.destroyed) {
          fsocket.destroy();
        }
        resolve();
      }, timeout * 1e3);
    });
  }

}
