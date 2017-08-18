import {Logger} from '../utils';

let logger = null;

export default class DirectCloseBehaviour {

  constructor() {
    logger = Logger.getInstance();
  }

  async run({remoteAddr, bsocket, fsocket}) {
    logger.warn(`[behaviour] [${remoteAddr}] connection closed directly`);
    if (bsocket !== null && !bsocket.destroyed) {
      bsocket.destroy();
    }
    if (fsocket !== null && !fsocket.destroyed) {
      fsocket.destroy();
    }
  }

}
