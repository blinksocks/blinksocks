jest.mock('fs');

import {Config, DEFAULT_LOG_LEVEL} from '../config';

beforeEach(function () {
  const fs = require('fs');
  fs.lstatSync = () => {
    const err = new Error();
    err.code = 'ENOENT';
    throw err;
  };
});

describe('Config#init', function () {

  // exceptions

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

  it('should throw when servers(if provided) is not an array', function () {
    expect(() => Config.init({host: 'localhost', port: 1080, servers: ''})).toThrow();
  });

  it('should throw when servers(if provided) is an array but empty', function () {
    expect(() => Config.init({host: 'localhost', port: 1080, servers: []})).toThrow();
  });

  it('should throw when redirect is invalid', function () {
    expect(function () {
      Config.init({
        host: 'localhost',
        port: 1080,
        servers: [{
          enabled: true,
          host: 'abc.com',
          port: 443,
          key: 'secret',
          presets: [{
            name: 'ss-base',
            params: {}
          }, {
            name: 'ss-stream-cipher',
            params: {
              method: 'aes-128-cfb'
            }
          }]
        }],
        redirect: 'test.com'
      });
    }).toThrow();
  });

  it('should throw when timeout is invalid', function () {
    const conf = {
      host: 'localhost',
      port: 1080,
      key: 'abc',
      presets: [{
        name: 'ss-base',
        params: {}
      }, {
        name: 'ss-stream-cipher',
        params: {
          method: 'aes-128-cfb'
        }
      }],
      redirect: 'test.com:443'
    };

    expect(function () {
      Config.init({...conf, timeout: '0'});
    }).toThrow();

    expect(function () {
      Config.init({...conf, timeout: 0});
    }).toThrow();

    expect(function () {
      Config.init({...conf, timeout: 1});
    }).not.toThrow();
  });

  // others

  it('should __IS_SERVER__ set to true, if no servers provided', function () {
    Config.init({
      host: 'localhost',
      port: 1080,
      key: 'abc',
      presets: [{
        name: 'ss-base',
        params: {}
      }, {
        name: 'ss-stream-cipher',
        params: {
          method: 'aes-128-cfb'
        }
      }],
      redirect: 'test.com:443',
      timeout: 300
    });
    expect(__IS_SERVER__).toBe(true);
  });

});

describe('Config#initServer', function () {

  it('should throw when server.key is not string', function () {
    expect(() => Config.initServer({key: null})).toThrow();
  });

  it('should throw when server.key is empty', function () {
    expect(() => Config.initServer({key: ''})).toThrow();
  });

  it('should throw when server.presets is not an array', function () {
    expect(() => Config.initServer({key: 'secret', presets: null})).toThrow();
  });

  it('should throw when server.presets is empty', function () {
    expect(() => Config.initServer({key: 'secret', presets: []})).toThrow();
  });

  it('should throw when server[].preset.name is not present', function () {
    expect(function () {
      Config.initServer({
        key: 'secret',
        presets: [{}]
      });
    }).toThrow();
  });

  it('should throw when server[].preset.name is empty', function () {
    expect(function () {
      Config.initServer({
        key: 'secret',
        presets: [{
          name: ''
        }]
      });
    }).toThrow();
  });

});

describe('Config#setUpLogger', function () {

  it('should set log level to DEFAULT_LOG_LEVEL', function () {
    expect(Config.setUpLogger()).toBe(DEFAULT_LOG_LEVEL);
  });

  it('should set log level to silly', function () {
    expect(Config.setUpLogger('silly')).toBe('silly');
  });

});
