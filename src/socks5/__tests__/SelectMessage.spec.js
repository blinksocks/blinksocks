import {SelectMessage} from '../SelectMessage';
import {SOCKS_VERSION_V5, METHOD_NO_AUTH} from '../Constants';

describe('SelectMessage#toBuffer', function () {

  it('should return the expected buffer', function () {
    const message = new SelectMessage();
    const buffer = Buffer.from([SOCKS_VERSION_V5, METHOD_NO_AUTH]);
    expect(message.toBuffer().equals(buffer)).toBe(true);
  });

});
