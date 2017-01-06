import {Message} from '../common';
import {SOCKS_VERSION_V5, METHOD_NO_AUTH} from './Constants';

// +----+--------+
// |VER | METHOD |
// +----+--------+
// | 1  |   1    |
// +----+--------+

export class SelectMessage extends Message {

  VER;

  METHOD;

  constructor(options) {
    super();
    const fields = {
      VER: SOCKS_VERSION_V5,
      METHOD: METHOD_NO_AUTH,
      ...options
    };
    this.VER = fields.VER;
    this.METHOD = fields.METHOD;
  }

  toBuffer() {
    return Buffer.from([this.VER, this.METHOD]);
  }

}
