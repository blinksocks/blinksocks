import net from 'net';
import url from 'url';
import {
  ATYP_DOMAIN,
  ATYP_V4,
  ATYP_V6
} from '../proxies/common';

export class Utils {

  /**
   * convert a number to a buffer with specified length in big-endian
   * @param num
   * @param len
   * @returns {Buffer}
   */
  static numberToUIntBE(num, len = 2) {
    if (len < 1) {
      throw Error('len must be greater than 1');
    }

    const isOutOfRange = num > parseInt(`0x${'ff'.repeat(len)}`);
    if (isOutOfRange) {
      throw Error(`Number ${num} is too long to store in a '${len}' length buffer`);
    }

    const buf = Buffer.alloc(len);
    buf.writeUIntBE(num, 0, len);
    return buf;
  }

  /**
   * convert an uri to Address
   * @param uri
   * @returns {{type: Number, host: Buffer, port: Buffer}}
   */
  static parseURI(uri) {
    let _uri = uri;
    if (_uri.indexOf('http') !== 0 && _uri.indexOf('https') !== 0) {
      if (_uri.indexOf(':443') !== -1) {
        // e.g, bing.com:443
        _uri = `https://${_uri}`;
      } else {
        // e.g, bing.com
        _uri = `http://${_uri}`;
      }
    }
    const {protocol, hostname} = url.parse(_uri);
    const isIp = net.isIP(hostname);
    const addrType = isIp ? (net.isIPv4(hostname) ? ATYP_V4 : ATYP_V6) : ATYP_DOMAIN;
    const port = {'http:': 80, 'https:': 443}[protocol];
    return {
      type: addrType,
      host: hostname,
      port
    };
  }

}
