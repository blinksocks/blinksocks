import {RequestMessage} from '../RequestMessage';

describe('RequestMessage#parse', function () {

  it('should return null if buffer.length < 20', function () {
    expect(RequestMessage.parse([])).toBe(null);
  });

  it('should return null if METHOD is invalid', function () {
    const requestData = Buffer.from(`XXX www.bing.com:443 HTTP/1.1\r\n
Host: www.bing.com:443\r\n
`);
    expect(RequestMessage.parse(requestData)).toBe(null);
  });

  it('should return null if buffer is not a valid http message', function () {
    const requestData = Buffer.from('XXX www.bing.com:443 HTTP/1.1');
    expect(RequestMessage.parse(requestData)).toBe(null);
  });

  it('should return an instance', function () {
    const requestData = Buffer.from(`CONNECT www.bing.com:443 HTTP/1.1\r\n
Host: www.bing.com:443\r\n
`);
    expect(RequestMessage.parse(requestData)).not.toBe(null);
  });

});
