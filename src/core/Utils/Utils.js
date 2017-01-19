import net from 'net';
import url from 'url';
import ip from 'ip';
import {Address} from '../Address';
import {ATYP_DOMAIN, ATYP_V4, ATYP_V6} from '../../proxies/common';

export class Utils {

  /**
   * convert a number to byte array
   * @example
   *   numberToArray(257); // [0x01, 0x01]
   * @param num
   * @param minSize
   * @returns {Array.<*>}
   */
  static numberToArray(num, minSize = 2) {
    let arr = [];
    do {
      arr.push(num & 0xff);
      num >>= 8;
    } while (num > 0);
    if (arr.length < minSize) {
      const padding = [];
      for (let i = 0, len = minSize - arr.length; i < len; ++i) {
        padding.push(0x00);
      }
      arr = [...arr, ...padding];
    }
    return arr.reverse();
  }

  /**
   * convert an uri to Address
   * @param uri
   * @returns {Address}
   */
  static hostToAddress(uri) {
    let _uri = uri;
    if (_uri.indexOf('http') !== 0 || _uri.indexOf('https') !== 0) {
      if (_uri.indexOf(':443') !== -1) {
        // e.g, bing.com:443
        _uri = `https://${_uri}`;
      } else {
        // e.g, bing.com
        _uri = `http://${_uri}`;
      }
    }
    const {hostname, port} = url.parse(_uri);
    const addrType = net.isIP(hostname) ? (net.isIPv4(hostname) ? ATYP_V4 : ATYP_V6) : ATYP_DOMAIN;
    const dstAddr = net.isIP(hostname) ? ip.toBuffer(hostname) : Buffer.from(hostname);
    const dstPort = Buffer.from(Utils.numberToArray(port === null ? 80 : port));
    return new Address({
      ATYP: addrType,
      DSTADDR: dstAddr,
      DSTPORT: dstPort
    });
  }

}
