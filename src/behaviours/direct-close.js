import {logger} from '../utils';

export default class DirectCloseBehaviour {

  async run({remoteHost, remotePort, onClose}) {
    logger.warn(`[behaviour] [${remoteHost}:${remotePort}] connection closed`);
    onClose();
  }

}
