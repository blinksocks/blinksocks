import net from 'net';
import ip from 'ip';
import {IPreset, SOCKET_CONNECT_TO_REMOTE} from './defs';
import {Proxifier, ATYP_DOMAIN, ATYP_V4, ATYP_V6} from '../proxies';
import {isValidHostname, isValidPort} from '../utils';

const MODE_PROXY = 0;
const MODE_TUNNEL = 1;

function getHostType(host) {
  if (net.isIPv4(host)) {
    return ATYP_V4;
  }
  if (net.isIPv6(host)) {
    return ATYP_V6;
  }
  return ATYP_DOMAIN;
}

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

  _isBroadCasting = false;

  _staging = Buffer.alloc(0);

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
            type: SOCKET_CONNECT_TO_REMOTE,
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

  handleTunnel({buffer, next, broadcast}) {
    if (!this._isTunnelReady) {
      if (this._isBroadCasting) {
        this._staging = Buffer.concat([this._staging, buffer]);
      } else {
        broadcast({
          type: SOCKET_CONNECT_TO_REMOTE,
          payload: {
            targetAddress: {type: getHostType(this._host), host: this._host, port: this._port},
            onConnected: () => {
              this._isTunnelReady = true;
              this._isBroadCasting = false;
              next(Buffer.concat([this._staging, buffer]));
            }
          }
        });
        this._isBroadCasting = true;
      }
    } else {
      return buffer;
    }
  }

  clientOut(props) {
    if (this._mode === MODE_PROXY) {
      return this.handleProxy(props);
    }
    if (this._mode === MODE_TUNNEL) {
      return this.handleTunnel(props);
    }
  }

  serverIn(props) {
    if (this._mode === MODE_PROXY) {
      return this.handleProxy(props);
    }
    if (this._mode === MODE_TUNNEL) {
      return this.handleTunnel(props);
    }
  }

}
