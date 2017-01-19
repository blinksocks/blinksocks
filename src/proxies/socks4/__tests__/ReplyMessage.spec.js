import {ReplyMessage} from '../ReplyMessage';
import {REPLY_GRANTED} from '../../common';

describe('ReplyMessage#toBuffer', function () {

  it('should return the expected buffer', function () {
    const message = new ReplyMessage();
    const buffer = Buffer.from([
      0, REPLY_GRANTED,
      0, 0,
      0, 0, 0, 0
    ]);
    expect(message.toBuffer().equals(buffer)).toBe(true);
  });

});

