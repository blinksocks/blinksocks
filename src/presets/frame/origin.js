import net from 'net';
import ip from 'ip';
import logger from 'winston';
import {IPreset} from '../interface';
import {SOCKET_CONNECT_TO_DST} from '../actions';
import {Utils} from '../../utils';

import {
  ATYP_V4,
  ATYP_V6,
  ATYP_DOMAIN
} from '../../proxies/common';

/**
 * @description
 *   Tell server where is the destination.
 *
 * @params
 *   no
 *
 * @examples
 *   "frame": "origin"
 *   "frame_params": ""
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
export default class OriginFrame extends IPreset {

  _isHandshakeDone = false;

  _atyp = ATYP_V4;

  _addr = null; // buffer

  _port = null; // buffer

  constructor(addr) {
    super();
    if (__IS_CLIENT__) {
      const {type, host, port} = addr;
      this._atyp = type;
      this._addr = net.isIP(host) ? ip.toBuffer(host) : Buffer.from(host);
      this._port = port instanceof Buffer ? port : Utils.numberToUInt(port);
    }
  }

  clientOut({buffer}) {
    if (!this._isHandshakeDone) {
      this._isHandshakeDone = true;
      return Buffer.from([
        this._atyp,
        ...(this._atyp === ATYP_DOMAIN) ? Utils.numberToUInt(this._addr.length, 1) : [],
        ...this._addr,
        ...this._port,
        ...buffer
      ]);
    } else {
      return buffer;
    }
  }

  serverIn({buffer, next, broadcast}) {
    if (!this._isHandshakeDone) {
      if (buffer.length < 7) {
        logger.error(`invalid length: ${buffer.length}`);
        return;
      }

      const atyp = buffer[0];
      if (![ATYP_DOMAIN, ATYP_V4, ATYP_V6].includes(atyp)) {
        logger.error(`invalid atyp: ${atyp}`);
        return;
      }

      let addr, port; // string
      let offset = 3;

      switch (atyp) {
        case ATYP_V4:
          addr = ip.toString(buffer.slice(1, 5));
          port = buffer.slice(5, 7).readUInt16BE(0);
          offset += 4;
          break;
        case ATYP_V6:
          if (buffer.length < 19) {
            logger.error(`invalid length: ${buffer.length}`);
            return;
          }
          addr = ip.toString(buffer.slice(1, 16));
          port = buffer.slice(16, 18).readUInt16BE(0);
          offset += 16;
          break;
        case ATYP_DOMAIN:
          const domainLen = buffer[1];
          if (buffer.length < domainLen + 4) {
            logger.error(`invalid length: ${buffer.length}`);
            return;
          }
          addr = buffer.slice(2, 2 + domainLen).toString();
          port = buffer.slice(2 + domainLen, 4 + domainLen).readUInt16BE(0);
          offset += domainLen + 1;
          break;
        default:
          logger.error(`invalid atyp: ${atyp}`);
          return;
      }

      // notify to connect to the real server
      broadcast({
        type: SOCKET_CONNECT_TO_DST,
        payload: [{
          type: atyp,
          host: addr,
          port
        }, () => { // once connected
          next(buffer.slice(offset));
          this._isHandshakeDone = true;
        }]
      });
    } else {
      return buffer;
    }
  }

  serverOut({buffer}) {
    return buffer;
  }

  clientIn({buffer}) {
    return buffer;
  }

}
