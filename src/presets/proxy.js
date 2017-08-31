import ip from 'ip';
import {IPreset, CONNECT_TO_REMOTE} from './defs';
import {Proxifier, ATYP_DOMAIN} from '../proxies';

/**
 * @description
 *   Proxy handshake using Proxifier.
 *
 * @examples
 *   {
 *     "name": "proxy"
 *   }
 */
export default class ProxyPreset extends IPreset {

  _proxy = null;

  handleProxy({buffer, next, broadcast}) {
    if (this._proxy === null) {
      this._proxy = new Proxifier({
        onHandshakeDone: (addr, callback) => {
          const [host, port] = [
            (addr.type === ATYP_DOMAIN) ? addr.host.toString() : ip.toString(addr.host),
            addr.port.readUInt16BE(0)
          ];
          broadcast({
            type: CONNECT_TO_REMOTE,
            payload: {
              host: host,
              port: port,
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
