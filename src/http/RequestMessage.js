import {Message} from '../common';

// +----------------------------------------+
// |  CONNECT www.bing.com:443 HTTP/1.1\r\n |
// |  Host: www.bing.com:443\r\n            |
// |  [...Headers]                          |
// |  \r\n                                  |
// +----------------------------------------+
export class RequestMessage extends Message {

  METHOD;

  URI;

  VERSION;

  HOST;

  constructor(options = {}) {
    super();
    const fields = {
      ...options
    };
    this.METHOD = fields.METHOD;
    this.URI = fields.URI;
    this.VERSION = fields.VERSION;
    this.HOST = fields.HOST;
  }

  static parse(buffer) {
    if (buffer.length < 20) {
      return null;
    }
    const str = buffer.toString();
    const lines = str.split('\r\n');
    const [method, uri, version] = lines[0].split(' ');
    const host = lines[1].split(' ')[1];
    const methods = [
      'OPTIONS', 'GET', 'HEAD', 'POST',
      'PUT', 'DELETE', 'TRACE', 'CONNECT'
    ];
    if (methods.includes(method)) {
      return new RequestMessage({
        METHOD: Buffer.from(method),
        URI: Buffer.from(uri),
        VERSION: Buffer.from(version),
        HOST: Buffer.from(host)
      });
    }
    return null;
  }

}
