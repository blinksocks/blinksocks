import ip from 'ip';
import {IPreset, SOCKET_CONNECT_TO_DST} from './defs';
import {Proxifier, ATYP_DOMAIN} from '../proxies';

/**
 * @description
 *   proxy traffic using Socks5/Socks4(a)/HTTP
 *
 * @note
 *   should only be used in blinksocks server
 *
 * @examples
 *
 *   // blinksocks.server.json
 *   {
 *     "host": "localhost",
 *     "port": 1080,
 *     "presets": [
 *       {
 *         "name": "proxy",
 *         "params": {}
 *       }
 *     ],
 *     ...
 *   }
 *
 *   $ blinksocks server --config blinksocks.server.json
 *   $ curl -L --socks5-hostname localhost:1080 https://www.bing.com
 */
export default class ProxyPreset extends IPreset {

  _proxy = null;

  beforeIn({buffer, direct, broadcast}) {
    if (this._proxy === null) {
      this._proxy = new Proxifier({
        onHandshakeDone: (addr, callback) => {
          const [host, port] = [
            (addr.type === ATYP_DOMAIN) ? addr.host.toString() : ip.toString(addr.host),
            addr.port.readUInt16BE(0)
          ];
          broadcast({
            type: SOCKET_CONNECT_TO_DST,
            payload: {
              targetAddress: {host, port},
              onConnected: () => callback(direct)
            }
          });
        }
      });
    }
    if (!this._proxy.isDone()) {
      this._proxy.makeHandshake((buf) => direct(buf, true), buffer);
    } else {
      return buffer;
    }
  }

}
