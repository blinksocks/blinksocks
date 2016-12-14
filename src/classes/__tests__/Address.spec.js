import {Address} from '../Address';
import {ATYP_V4, ATYP_V6, ATYP_DOMAIN} from '../../socks5/Constants';

describe('Address#constructor', function () {
  it('should throw when ATYP is not v4, v6 or domain', function () {
    expect(() => new Address({ATYP: null})).toThrow();
  });

  it('should throw when DSTADDR is not Array or Buffer', function () {
    expect(() => new Address({DSTADDR: null})).toThrow();
  });

  it('should throw when v4 DSTADDR.length is not 4', function () {
    expect(() => new Address({ATYP: ATYP_V4, DSTADDR: []})).toThrow();
  });

  it('should throw when v6 DSTADDR.length is not 16', function () {
    expect(() => new Address({ATYP: ATYP_V6, DSTADDR: []})).toThrow();
  });

  it('should throw when ATYP is not v4, v6 or domain', function () {
    expect(() => new Address({ATYP: null})).toThrow();
  });

  it('should throw when DSTPORT is not Array or Buffer', function () {
    expect(() => new Address({DSTPORT: null})).toThrow();
  });

  it('should throw when DSTADDR.length is not 2', function () {
    expect(() => new Address({DSTPORT: [1, 2, 3]})).toThrow();
  });
});

describe('Address#getEndPoint', function () {
  it('should throw when ATYP is invalid', function () {
    expect(() => {
      const conn = new Address();
      conn.ATYP = null;
      conn.getEndPoint();
    }).toThrow();
  });
});

describe('Address#toString', function () {
  it('should return ipv4 address', function () {
    const conn = new Address();
    expect(conn.toString()).toBe('0.0.0.0:0');
  });

  it('should return ipv6 address', function () {
    const conn = new Address({
      ATYP: ATYP_V6,
      DSTADDR: [
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
      ]
    });
    expect(conn.toString()).toBe('0102:0304:0506:0708:090a:0b0c:0d0e:0f10:0');
  });

  it('should return domain address', function () {
    const conn = new Address({
      ATYP: ATYP_DOMAIN,
      DSTADDR: Buffer.from([97, 98, 99, 46, 99, 111, 109]),
      DSTPORT: [0x00, 0x50]
    });
    expect(conn.toString()).toBe('abc.com:80');
  });
});
