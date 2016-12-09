jest.mock('fs');

import {Config, DEFAULT_CIPHER, DEFAULT_LOG_LEVEL} from '../Config';

beforeEach(function () {
  const fs = require('fs');
  fs.lstatSync = () => {
    const err = new Error();
    err.code = 'ENOENT';
    throw err;
  };
});

describe('Config#init', function () {

  it('should throw when pass non-object', function () {
    expect(() => Config.init(null)).toThrow();
    expect(() => Config.init([])).toThrow();
  });

  it('should throw when host is not provided', function () {
    expect(() => Config.init({})).toThrow();
    expect(() => Config.init({host: ''})).toThrow();
  });

  it('should throw when port is not natural number', function () {
    expect(() => Config.init({host: 'localhost', port: -1})).toThrow();
  });

  it('should throw when server_host(if provided) is empty', function () {
    expect(() => Config.init({host: 'localhost', port: 1080, server_host: ''})).toThrow();
  });

  it('should throw when server_port(if provided) is not natural number', function () {
    expect(() => Config.init({host: 'localhost', port: 1080, server_host: 'localhost', server_port: 1.1})).toThrow();
  });

  it('should throw when password is not provided', function () {
    expect(function () {
      Config.init({
        host: 'localhost',
        port: 1080,
        server_host: 'localhost',
        server_port: 1080,
        password: ''
      });
    }).toThrow();
  });

  it('should throw when cipher is not provided', function () {
    Config.init({
      host: 'localhost',
      port: 1080,
      server_host: 'localhost',
      server_port: 1080,
      password: '123',
      cipher: ''
    });
    expect(Config.cipher).toBe('');
  });

  it('should throw when cipher is not provided', function () {
    expect(function () {
      Config.init({
        host: 'localhost',
        port: 1080,
        server_host: 'localhost',
        server_port: 1080,
        password: '123'
      });
    }).toThrow();
  });

  it('isServer should be false', function () {
    Config.init({
      host: 'localhost',
      port: 1080,
      server_host: 'localhost',
      server_port: 1080,
      password: '123',
      cipher: 'aes-256-cfb'
    });
    expect(Config.isServer).toBe(false);
  });

});

describe('Config#obtainCipher', function () {

  it('should fallback to DEFAULT_CIPHER', function () {
    expect(Config.obtainCipher('abc')).toBe(DEFAULT_CIPHER);
  });

});

describe('Config#setUpLogger', function () {

  it('should return DEFAULT_LOG_LEVEL', function () {
    expect(Config.setUpLogger()).toBe(DEFAULT_LOG_LEVEL);
  });

});
