import ip from 'ip';
import {IPreset, SOCKET_CONNECT_TO_DST, PROXY_HANDSHAKE_DONE} from './defs';
import {Proxifier, ATYP_DOMAIN} from '../proxies';

/**
 * @description
 *   proxy traffic using proxies/proxifier.js
 *
 * @examples
 *
 *   // blinksocks.server.json
 *   {
 *     "host": "localhost",
 *     "port": 1080,
 *     "presets": [
 *       {
 *         "name": "proxy"
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

  handleProxy({buffer, direct, broadcast}) {
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

  clientOut(props) {
    return this.handleProxy(props);
  }

  serverIn(props) {
    return this.handleProxy(props);
  }

}
