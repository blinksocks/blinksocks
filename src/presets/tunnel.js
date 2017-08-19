import {IPreset, SOCKET_CONNECT_TO_REMOTE} from './defs';
import {isValidHostname, isValidPort} from '../utils';

/**
 * @description
 *   proxy traffic to destination
 *
 * @params
 *   host(optional): destination host
 *   port(optional): destination port
 *
 * @examples
 *   {
 *     "name": "tunnel",
 *     "params": {
 *       "host": "localhost",
 *       "port": 1082
 *     }
 *   }
 */
export default class TunnelPreset extends IPreset {

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
      this._host = host;
      this._port = port;
    }
  }

  handleTunnel({buffer, next, broadcast}) {
    if (!this._isTunnelReady) {
      if (this._isBroadCasting) {
        this._staging = Buffer.concat([this._staging, buffer]);
      } else {
        this._isBroadCasting = true;
        broadcast({
          type: SOCKET_CONNECT_TO_REMOTE,
          payload: {
            host: this._host,
            port: this._port,
            onConnected: () => {
              next(Buffer.concat([buffer, this._staging]));
              this._isTunnelReady = true;
              this._isBroadCasting = false;
              this._staging = null;
            }
          }
        });
      }
    } else {
      return buffer;
    }
  }

  clientOut(props) {
    return this.handleTunnel(props);
  }

  serverIn(props) {
    return this.handleTunnel(props);
  }

}
