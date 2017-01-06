import {ConnectReplyMessage} from '../ConnectReplyMessage';

describe('ConnectReplyMessage#toBuffer', function () {

  it('should return an expected buffer', function () {
    const message = new ConnectReplyMessage();
    const buf = message.toBuffer();
    expect(buf.slice(0, 5).equals(Buffer.from([0x48, 0x54, 0x54, 0x50, 0x2f]))).toBe(true);
  });

});
