import ip from 'ip';
import {IPreset, SOCKET_CONNECT_TO_DST, PROXY_HANDSHAKE_DONE} from './defs';
import {Proxifier, ATYP_DOMAIN} from '../proxies';

/**
 * @description
 *   proxy traffic
 *
 * @params
 *   host(optional): destination host
 *   port(optional): destination port
 *
 * @examples
 *   proxy mode, using proxifier
 *   {"name": "proxy"}
 *
 *   tunnel mode, relay directly
 *   {
 *     "name": "proxy",
 *     "params": {
 *       "host": "localhost",
 *       "port": 1082
 *     }
 *   }
 */
export default class ProxyPreset extends IPreset {

  _proxy = null;

  handleProxy({buffer, next, broadcast}) {
    if (this._proxy === null) {
      this._proxy = new Proxifier({
        onHandshakeDone: (addr, callback) => {
          const [type, host, port] = [
            addr.type,
            (addr.type === ATYP_DOMAIN) ? addr.host.toString() : ip.toString(addr.host),
            addr.port.readUInt16BE(0)
          ];
          broadcast({
            type: __IS_CLIENT__ ? PROXY_HANDSHAKE_DONE : SOCKET_CONNECT_TO_DST,
            payload: {
              targetAddress: {type, host, port},
              onConnected: () => callback(next)
            }
          });
        }
      });
    }
    if (!this._proxy.isDone()) {
      const feedback = (buf) => next(buf, true);
      this._proxy.makeHandshake(feedback, buffer);
    } else {
      return buffer;
    }
  }

  clientOut(props) {
    return this.handleProxy(props);
  }

  serverIn(props) {
    return this.handleProxy(props);
  }

}
