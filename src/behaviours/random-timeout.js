import {getRandomInt, Logger} from '../utils';

const DEFAULT_TIMEOUT_MIN = 10;
const DEFAULT_TIMEOUT_MAX = 40;

let logger = null;

export default class RandomTimeoutBehaviour {

  min = DEFAULT_TIMEOUT_MIN;

  max = DEFAULT_TIMEOUT_MAX;

  constructor({min, max}) {
    logger = Logger.getInstance();
    if (min !== undefined) {
      if (!Number.isInteger(min)) {
        throw Error('\'min\' must be an integer');
      }
      if (min < 0) {
        throw Error('\'min\' must be greater than 0');
      }
    }
    if (max !== undefined) {
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

  async run({remoteHost, remotePort, onClose}) {
    const timeout = getRandomInt(this.min, this.max);
    logger.warn(`[behaviour] [${remoteHost}:${remotePort}] connection will be closed in ${timeout}s...`);
    return new Promise((resolve) => {
      setTimeout(() => {
        onClose();
        resolve();
      }, timeout * 1e3);
    });
  }

}
