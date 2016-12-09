import {IdentifierMessage} from '../IdentifierMessage';
import {SOCKS_VERSION_V5, METHOD_NO_AUTH} from '../Constants';

describe('IdentifierMessage#parse', function () {

  it('should return null if buffer.length < 3', function () {
    expect(IdentifierMessage.parse([])).toBe(null);
  });

  it('should return null if is not SOCKS_VERSION_V5', function () {
    expect(IdentifierMessage.parse([0, 0, 0])).toBe(null);
  });

  it('should return null if NMETHODS < 1', function () {
    expect(IdentifierMessage.parse([SOCKS_VERSION_V5, 0, 0])).toBe(null);
  });

  it('should return null if NMETHODS !== METHODS.length', function () {
    expect(IdentifierMessage.parse([SOCKS_VERSION_V5, 2, 0])).toBe(null);
  });

  it('should return an instance', function () {
    expect(IdentifierMessage.parse([SOCKS_VERSION_V5, 1, METHOD_NO_AUTH])).not.toBe(null);
  });

});

describe('IdentifierMessage#toBuffer', function () {

  it('should return the expected buffer', function () {
    const message = new IdentifierMessage();
    const buffer = Buffer.from([SOCKS_VERSION_V5, 1, METHOD_NO_AUTH]);
    expect(message.toBuffer().equals(buffer)).toBe(true);
  });

});
