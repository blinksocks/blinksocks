import {UdpRequestMessage} from '../UdpRequestMessage';
import {
  ATYP_V4,
  ATYP_V6,
  ATYP_DOMAIN,
  NOOP
} from '../../common';

describe('UdpRequestMessage#parse', function () {

  it('should return null if buffer.length < 7', function () {
    expect(UdpRequestMessage.parse([])).toBe(null);
  });

  it('should return null if the first two bytes are not NOOP', function () {
    expect(UdpRequestMessage.parse([0x01, 0x01, 0, 0, 0, 0, 0])).toBe(null);
  });

  it('should return null if the ATYP is invalid', function () {
    expect(UdpRequestMessage.parse([
      NOOP, NOOP,
      0, 0, 0, 0, 0, 0
    ])).toBe(null);
  });

  it('should return an instance', function () {
    expect(UdpRequestMessage.parse([
      NOOP, NOOP,
      0, ATYP_V4, 0, 0, 0, 0, 0, 0
    ])).not.toBe(null);

    expect(UdpRequestMessage.parse([
      NOOP, NOOP,
      0, ATYP_V6,
      0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0,
      0, 0
    ])).not.toBe(null);

    expect(UdpRequestMessage.parse([
      NOOP, NOOP,
      0, ATYP_DOMAIN, 3, 0, 0, 0, 0, 0
    ])).not.toBe(null);
  });

});
