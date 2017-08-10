import ip from 'ip';
import {IPreset, SOCKET_CONNECT_TO_DST, PROXY_HANDSHAKE_DONE} from './defs';
import {Proxifier, ATYP_DOMAIN} from '../proxies';
import {isValidHostname, isValidPort} from '../utils';

const MODE_PROXY = 0;
const MODE_TUNNEL = 1;

/**
 * @description
 *   proxy traffic
 *
 * @params
 *   host(optional): destination host
 *   port(optional): destination port
 *
 * @examples
 *   - proxy mode, using proxifier
 *   {"name": "proxy"}
 *
 *   - tunnel mode, relay directly
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

  _mode = MODE_PROXY;

  _host = null;

  _port = null;

  _isTunnelReady = false;

  constructor({host, port}) {
    super();
    if (typeof host !== 'undefined' && !isValidHostname(host)) {
      throw Error('host is invalid');
    }
    if (typeof port !== 'undefined' && !isValidPort(port)) {
      throw Error('port is invalid');
    }
    if (host && port) {
      this._mode = MODE_TUNNEL;
      this._host = host;
      this._port = port;
    }
  }

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
    if (this._mode === MODE_TUNNEL && !this._isTunnelReady) {
      const {buffer, broadcast, next} = props;
      broadcast({
        type: SOCKET_CONNECT_TO_DST,
        payload: {
          targetAddress: {type: null, host: this._host, port: this._port},
          onConnected: () => next(buffer)
        }
      });
    }
    return this.handleProxy(props);
  }

  serverIn(props) {
    return this.handleProxy(props);
  }

}
