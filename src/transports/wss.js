import { WsInbound, WsOutbound } from './ws';

export class WssInbound extends WsInbound {

  get name() {
    return 'wss:inbound';
  }

}

export class WssOutbound extends WsOutbound {

  get name() {
    return 'wss:outbound';
  }

  getConnAddress({ host, port, pathname }) {
    return `wss://${host}:${port}` + (pathname ? pathname : '');
  }

  getConnOptions(options) {
    const _options = { ...options };
    if (this._config.tls_cert_self_signed) {
      _options.ca = [this._config.tls_cert];
    }
    return _options;
  }

}
