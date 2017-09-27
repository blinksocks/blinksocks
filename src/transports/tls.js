import tls from 'tls';
import {TcpInbound, TcpOutbound} from './tcp';
import {logger} from '../utils';

export class TlsInbound extends TcpInbound {

  // https://github.com/nodejs/node/issues/15005
  get bufferSize() {
    return super.bufferSize - 1;
  }

}

export class TlsOutbound extends TcpOutbound {

  // https://github.com/nodejs/node/issues/15005
  get bufferSize() {
    return super.bufferSize - 1;
  }

  // overwrite _connect of tcp outbound using tls.connect()
  async _connect({host, port}) {
    logger.info(`[tls:outbound] [${this.remote}] connecting to: ${host}:${port}`);
    return new Promise((resolve) => {
      const socket = tls.connect({host, port, ca: [__TLS_CERT__]}, () => resolve(socket));
    });
  }

}
