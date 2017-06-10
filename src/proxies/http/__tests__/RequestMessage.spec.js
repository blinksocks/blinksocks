import {HttpRequestMessage} from '../HttpRequestMessage';

describe('RequestMessage#constructor', function () {

  it('should create an instance', function () {
    expect(() => new HttpRequestMessage()).not.toThrow();
  });

});

describe('RequestMessage#parse', function () {

  it('should return null if buffer.length < 20', function () {
    expect(HttpRequestMessage.parse([])).toBe(null);
  });

  it('should return null if METHOD is invalid', function () {
    const requestData = Buffer.from('XXX www.bing.com:443 HTTP/1.1\r\nHost: www.bing.com:443\r\n\r\n');
    expect(HttpRequestMessage.parse(requestData)).toBe(null);
  });

  it('should return null if buffer is not a valid http message', function () {
    const requestData = Buffer.from('XXX www.bing.com:443 HTTP/1.1');
    expect(HttpRequestMessage.parse(requestData)).toBe(null);
  });

  it('should return null if no Host header found', function () {
    const requestData = Buffer.from('CONNECT www.bing.com:443 HTTP/1.1\r\nHOST: www.bing.com:443\r\n\r\n');
    expect(HttpRequestMessage.parse(requestData)).toBe(null);
  });

  it('should return an instance', function () {
    const requestData = Buffer.from('CONNECT www.bing.com:443 HTTP/1.1\r\nHost: www.bing.com:443\r\n\r\n');
    expect(HttpRequestMessage.parse(requestData)).not.toBe(null);
  });

});
