import {Message} from '../Message';

describe('Message#parse', function () {

  it('should return null', function () {
    expect(Message.parse()).toBe(null);
  });

});

describe('Message#toBuffer', function () {

  it('should return empty buffer', function () {
    const message = new Message();
    expect(message.toBuffer().length).toBe(0);
  });

});
