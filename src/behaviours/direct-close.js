import {Logger} from '../utils';

let logger = null;

export default class DirectCloseBehaviour {

  constructor() {
    logger = Logger.getInstance();
  }

  async run({remoteHost, remotePort, onClose}) {
    logger.warn(`[behaviour] [${remoteHost}:${remotePort}] connection closed`);
    onClose();
  }

}
