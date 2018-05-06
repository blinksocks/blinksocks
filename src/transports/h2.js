import http2 from 'http2';
import { TcpInbound, TcpOutbound } from './tcp';
import { logger } from '../utils';

const { HTTP2_HEADER_PATH } = http2.constants;

export class Http2Inbound extends TcpInbound {

  get name() {
    return 'h2:inbound';
  }

}

export class Http2Outbound extends TcpOutbound {

  get name() {
    return 'h2:outbound';
  }

  async _connect({ host, port }) {
    logger.info(`[h2:outbound] [${this.remote}] connecting to h2://${host}:${port}`);
    const session = http2.connect(`https://${host}:${port}`, { ca: [this._config.tls_cert] });
    return session.request({ [HTTP2_HEADER_PATH]: '/' });
  }

}
