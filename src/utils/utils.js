import net from 'net';
import url from 'url';
import ip from 'ip';
import {Address} from '../core/address';
import {ATYP_DOMAIN, ATYP_V4, ATYP_V6} from '../proxies/common';

export class Utils {

  /**
   * convert a number to a buffer with specified length in big-endian
   * @param num
   * @param len
   * @returns {Buffer}
   */
  static toBytesBE(num, len = 2) {
    const buf = Buffer.alloc(len);
    buf.writeUIntBE(num, 0, len);
    return buf;
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
    const dstPort = Utils.toBytesBE(port === null ? 80 : port);
    return new Address({
      ATYP: addrType,
      DSTADDR: dstAddr,
      DSTPORT: dstPort
    });
  }

}
