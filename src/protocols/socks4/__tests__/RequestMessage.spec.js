import {RequestMessage} from '../RequestMessage';
import {SOCKS_VERSION_V4, REQUEST_COMMAND_CONNECT} from '../../common';

describe('RequestMessage#parse', function () {

  it('should return null if buffer.length < 9', function () {
    expect(RequestMessage.parse([])).toBe(null);
  });

  it('should return null if VER is not SOCKS_VERSION_V4', function () {
    expect(RequestMessage.parse([0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(null);
  });

  it('should return null if CMD is invalid', function () {
    expect(RequestMessage.parse([
      SOCKS_VERSION_V4,
      0x03, 0, 0, 0, 0, 0, 0, 0
    ])).toBe(null);
  });

  it('should return null if NULL is not 0', function () {
    expect(RequestMessage.parse([
      SOCKS_VERSION_V4,
      REQUEST_COMMAND_CONNECT, 0, 0, 0, 0, 0, 0, 1
    ])).toBe(null);
  });

  it('should return an instance', function () {
    expect(RequestMessage.parse([
      SOCKS_VERSION_V4,
      REQUEST_COMMAND_CONNECT, 0, 0, 0, 0, 0, 0, 0
    ])).not.toBe(null);
  });

});
