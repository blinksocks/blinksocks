import tls from 'tls';
import { TcpInbound, TcpOutbound } from './tcp';
import { logger } from '../utils';

export class TlsInbound extends TcpInbound {

  get name() {
    return 'tls:inbound';
  }

  // https://github.com/nodejs/node/issues/15005
  get bufferSize() {
    return super.bufferSize - 1;
  }

}

export class TlsOutbound extends TcpOutbound {

  get name() {
    return 'tls:outbound';
  }

  // https://github.com/nodejs/node/issues/15005
  get bufferSize() {
    return super.bufferSize - 1;
  }

  // overwrite _connect of tcp outbound using tls.connect()
  async _connect({ host, port }) {
    logger.info(`[tls:outbound] [${this.remote}] connecting to tls://${host}:${port}`);
    const options = { host, port };
    if (this._config.tls_cert_self_signed) {
      options.ca = [this._config.tls_cert];
    }
    return tls.connect(options);
  }

}
