import net from 'net';
import ip from 'ip';
import {isValidHostname, numberToBuffer, hash} from '../utils';
import {IPreset, SOCKET_CONNECT_TO_DST, PROXY_HANDSHAKE_DONE} from './defs';

/**
 * @description
 *   Interpret the destination address(ip/hostname) and port.
 *
 * @notice
 *   This preset should be used with ciphers in cfb mode.
 *
 * @params
 *   salt: a string for generating padding
 *
 * @examples
 *   {
 *     "name": "exp-base-with-padding",
 *     "params": {
 *       "salt": "any string"
 *     }
 *   }
 *
 * @protocol
 *
 *   # TCP stream
 *   +------+-----------+----------+----------+----------+---------+
 *   | ALEN |  PADDING  | DST.ADDR | DST.PORT |   DATA   |   ...   |
 *   +------+-----------+----------+----------+----------+---------+
 *   |  1   |    15     | Variable |    2     | Variable |   ...   |
 *   +------+-----------+----------+----------+----------+---------+
 *
 *   # TCP chunks
 *   +----------+
 *   |   DATA   |
 *   +----------+
 *   | Variable |
 *   +----------+
 *
 * @explain
 *   1. ALEN = len(DST.ADDR).
 *   2. PADDING = SHA256(salt).slice(0, 15).
 *   3. The initial stream MUST contain a DATA chunk followed by [ALEN, PADDING, DST.ADDR, DST.PORT].
 */
export default class ExpBaseWithPaddingPreset extends IPreset {

  _isHandshakeDone = false;

  _isAddressReceived = false;

  _host = null; // buffer

  _port = null; // buffer

  _padding = null; // buffer

  _staging = Buffer.alloc(0);

  constructor({salt}) {
    super();
    if (typeof salt !== 'string' || salt === '') {
      throw Error('\'salt\' must be set to a non-empty string');
    }
    this._padding = hash('sha256', salt).slice(0, 15);
  }

  onNotified(action) {
    if (__IS_CLIENT__ && action.type === PROXY_HANDSHAKE_DONE) {
      const {host, port} = action.payload.targetAddress;
      this._host = Buffer.from(host);
      this._port = numberToBuffer(port);
    }
  }

  clientOut({buffer}) {
    if (!this._isHandshakeDone) {
      this._isHandshakeDone = true;
      return Buffer.concat([
        numberToBuffer(this._host.length, 1), this._padding, this._host, this._port, buffer
      ]);
    } else {
      return buffer;
    }
  }

  serverIn({buffer, next, broadcast, fail}) {
    if (!this._isHandshakeDone) {

      // shadowsocks aead cipher put "addressing" part into the first chunk
      // we must wait onConnected() before next().
      if (this._isAddressReceived) {
        this._staging = Buffer.concat([this._staging, buffer]);
        return;
      }

      // minimal length required
      if (buffer.length < 20) {
        return fail(`unexpected buffer length: ${buffer.length}, buffer=${buffer.toString('hex')}`);
      }

      // verify padding
      if (!buffer.slice(1, 16).equals(this._padding)) {
        return fail(`unexpected padding=${this._padding.toString('hex')}`);
      }

      // obtain addr length
      const alen = buffer[0];

      if (buffer.length <= alen + 18) {
        return fail(`unexpected buffer length: ${buffer.length}, buffer=${buffer.toString('hex')}`);
      }

      // verify addr
      let addr = buffer.slice(16, 16 + alen);

      if (isValidHostname(addr)) {
        addr = addr.toString();
      } else if (net.isIP(addr)) {
        addr = ip.toString(addr);
      } else {
        return fail(`invalid addr: (${addr.toString()})`);
      }

      // obtain port and data
      const port = buffer.slice(alen + 16, alen + 18).readUInt16BE(0);
      const data = buffer.slice(alen + 18);

      // notify to connect to the real server
      broadcast({
        type: SOCKET_CONNECT_TO_DST,
        payload: {
          targetAddress: {
            host: addr,
            port
          },
          // once connected
          onConnected: () => {
            next(Buffer.concat([this._staging, data]));
            this._isHandshakeDone = true;
            this._staging = null;
          }
        }
      });
      this._isAddressReceived = true;
    } else {
      return buffer;
    }
  }

}
