import ip from 'ip';
import {isValidHostname, numberToBuffer} from '../utils';
import {IPreset, SOCKET_CONNECT_TO_DST} from './defs';

const ATYP_V4 = 0x01;
const ATYP_V6 = 0x04;
const ATYP_DOMAIN = 0x03;

/**
 * @description
 *   Tell server where is the destination.
 *
 * @params
 *   no
 *
 * @examples
 *   {
 *     "name": "ss-base",
 *     "params": {}
 *   }
 *
 * @protocol
 *
 *   # TCP handshake
 *   +------+----------+----------+----------+
 *   | ATYP | DST.ADDR | DST.PORT |   DATA   |
 *   +------+----------+----------+----------+
 *   |  1   | Variable |    2     | Variable |
 *   +------+----------+----------+----------+
 *
 *   # TCP chunk
 *   +----------+
 *   |   DATA   |
 *   +----------+
 *   | Variable |
 *   +----------+
 *
 * @explain
 *   1. ATYP is one of [0x01(ipv4), 0x03(hostname), 0x04(ipv6)].
 *   2. When ATYP is 0x03, DST.ADDR[0] is len(DST.ADDR).
 *   3. When ATYP is 0x04, DST.ADDR is a 16 bytes ipv6 address.
 */
export default class SSBasePreset extends IPreset {

  _isHandshakeDone = false;

  _isAddressReceived = false;

  _atyp = ATYP_V4;

  _host = null; // buffer

  _port = null; // buffer

  _staging = Buffer.alloc(0);

  constructor(addr) {
    super();
    if (__IS_CLIENT__) {
      const {type, host, port} = addr;
      this._atyp = type;
      this._port = port;
      this._host = host;
    }
  }

  clientOut({buffer}) {
    if (!this._isHandshakeDone) {
      this._isHandshakeDone = true;
      return Buffer.from([
        this._atyp,
        ...(this._atyp === ATYP_DOMAIN) ? numberToBuffer(this._host.length, 1) : [],
        ...this._host,
        ...this._port,
        ...buffer
      ]);
    } else {
      return buffer;
    }
  }

  serverIn({buffer, next, broadcast, fail}) {
    if (!this._isHandshakeDone) {

      // shadowsocks aead cipher put [atyp][dst.addr][dst.port] into the first chunk
      // we must wait onConnected() before next().
      if (this._isAddressReceived) {
        this._staging = Buffer.concat([this._staging, buffer]);
        return;
      }

      if (buffer.length < 7) {
        fail(`invalid length: ${buffer.length}`);
        return;
      }

      const atyp = buffer[0];

      let addr; // string
      let port; // number
      let offset = 3;

      switch (atyp) {
        case ATYP_V4:
          addr = ip.toString(buffer.slice(1, 5));
          port = buffer.slice(5, 7).readUInt16BE(0);
          offset += 4;
          break;
        case ATYP_V6:
          if (buffer.length < 19) {
            fail(`invalid length: ${buffer.length}`);
            return;
          }
          addr = ip.toString(buffer.slice(1, 17));
          port = buffer.slice(16, 18).readUInt16BE(0);
          offset += 16;
          break;
        case ATYP_DOMAIN:
          const domainLen = buffer[1];
          if (buffer.length < domainLen + 4) {
            fail(`invalid length: ${buffer.length}`);
            return;
          }
          addr = buffer.slice(2, 2 + domainLen).toString();
          if (!isValidHostname(addr)) {
            fail(`addr=${addr} is an invalid hostname`);
            return;
          }
          port = buffer.slice(2 + domainLen, 4 + domainLen).readUInt16BE(0);
          offset += (domainLen + 1);
          break;
        default:
          fail(`invalid atyp: ${atyp}`);
          return;
      }

      const data = buffer.slice(offset);

      // notify to connect to the real server
      broadcast({
        type: SOCKET_CONNECT_TO_DST,
        payload: {
          targetAddress: {
            type: atyp,
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
