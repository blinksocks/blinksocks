import {RequestMessage} from '../RequestMessage';
import {SOCKS_VERSION_V5} from '../Constants';

describe('RequestMessage#parse', function () {

  it('should return null if buffer.length < 9', function () {
    expect(RequestMessage.parse([])).toBe(null);
  });

  it('should return null if VER is not SOCKS_VERSION_V5', function () {
    expect(RequestMessage.parse([0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(null);
  });

  it('should return null if CMD is invalid', function () {
    expect(RequestMessage.parse([
      SOCKS_VERSION_V5,
      0x04, 0, 0, 0, 0, 0, 0, 0
    ])).toBe(null);
  });

  it('should return null if RSV is not 0x00', function () {
    expect(RequestMessage.parse([
      SOCKS_VERSION_V5,
      0x03, 0x01, 0, 0, 0, 0, 0, 0
    ])).toBe(null);
  });

  it('should return null if ATYP is invalid', function () {
    expect(RequestMessage.parse([
      SOCKS_VERSION_V5,
      0x01, 0, 0, 0, 0, 0, 0, 0
    ])).toBe(null);
  });

  it('should return an instance', function () {
    expect(RequestMessage.parse([
      SOCKS_VERSION_V5,
      0x03, 0x00, 0x01, 0, 0, 0, 0, 0
    ])).not.toBe(null);

    expect(RequestMessage.parse([
      SOCKS_VERSION_V5,
      0x03, 0x00, 0x03, 3, 0, 0, 0, 0, 0
    ])).not.toBe(null);

    expect(RequestMessage.parse([
      SOCKS_VERSION_V5, 0x03, 0x00, 0x04, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0
    ])).not.toBe(null);
  });

});
