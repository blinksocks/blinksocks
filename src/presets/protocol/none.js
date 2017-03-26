import {IPreset} from '../interface';

/**
 * @description
 *   This implementation is very basic but has high-performance. Use it
 *   according to the scenario.
 *
 * @params
 *  no
 *
 * @examples
 *   "protocol": "none"
 *   "protocol_params": ""
 *
 * @protocol
 *
 *   # TCP handshake & chunk
 *   +----------------------------+
 *   |           PAYLOAD          |
 *   +----------------------------+
 *   |           Variable         |
 *   +----------------------------+
 */
export default class NoneProtocol extends IPreset {

  clientOut({buffer}) {
    return buffer;
  }

  serverIn({buffer}) {
    return buffer;
  }

  serverOut({buffer}) {
    return buffer;
  }

  clientIn({buffer}) {
    return buffer;
  }

}
