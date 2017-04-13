jest.mock('fs');

import {
  Config,
  DEFAULT_KEY,
  DEFAULT_LOG_LEVEL
} from '../config';

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

  it('should throw when servers(if provided) is an array but has invalid items', function () {
    expect(() => Config.init({host: 'localhost', port: 1080, servers: ['']})).toThrow();
  });

  it('should throw when key is not string', function () {
    expect(function () {
      Config.init({
        host: 'localhost',
        port: 1080,
        servers: ['abc.com:443'],
        key: null
      });
    }).toThrow();
  });

  it('should throw when key is empty', function () {
    expect(function () {
      Config.init({
        host: 'localhost',
        port: 1080,
        servers: ['abc.com:443'],
        key: '',
      });
    }).toThrow();
  });

  it('should throw when key is DEFAULT_KEY', function () {
    expect(function () {
      Config.init({
        host: 'localhost',
        port: 1080,
        servers: ['abc.com:443'],
        key: DEFAULT_KEY
      });
    }).toThrow();
  });

  it('should throw when presets is not an array', function () {
    expect(function () {
      Config.init({
        host: 'localhost',
        port: 1080,
        servers: ['abc.com:443'],
        key: 'secret',
        presets: null
      });
    }).toThrow();
  });

  it('should throw when presets is empty', function () {
    expect(function () {
      Config.init({
        host: 'localhost',
        port: 1080,
        servers: ['abc.com:443'],
        key: 'secret',
        presets: []
      });
    }).toThrow();
  });

  it('should throw when presets is invalid', function () {
    expect(function () {
      Config.init({
        host: 'localhost',
        port: 1080,
        servers: ['abc.com:443'],
        key: 'secret',
        presets: [{}]
      });
    }).toThrow();
  });

  it('should throw when preset name is invalid', function () {
    expect(function () {
      Config.init({
        host: 'localhost',
        port: 1080,
        servers: ['abc.com:443'],
        key: 'secret',
        presets: [{
          name: ''
        }]
      });
    }).toThrow();
  });

  it('should throw when redirect is invalid', function () {
    expect(function () {
      Config.init({
        host: 'localhost',
        port: 1080,
        servers: ['abc.com:443'],
        key: 'secret',
        presets: [{
          name: 'ss-base',
          params: {}
        }, {
          name: 'ss-stream-cipher',
          params: {
            method: 'aes-128-cfb'
          }
        }],
        redirect: 'test.com'
      });
    }).toThrow();
  });

  it('should throw when timeout is invalid', function () {
    const conf = {
      host: 'localhost',
      port: 1080,
      servers: ['abc.com:443'],
      key: 'secret',
      presets: [{
        name: 'ss-base',
        params: {}
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

  it('should this._is_server set to true, if no server_host provided', function () {
    Config.init({
      host: 'localhost',
      port: 1080,
      key: '123',
      presets: [{
        name: 'ss-base',
        params: {}
      }],
      redirect: 'test.com:443',
      timeout: 300
    });
    expect(Config._is_server).toBe(true);
  });

});

describe('Config#setGlobals', function () {

  it('should set expected global constants', function () {
    Config.init({
      host: 'localhost',
      port: 1080,
      key: '123',
      presets: [{
        name: 'ss-base',
        params: {}
      }],
      timeout: 300
    });
    expect(__IS_SERVER__).toBe(true);
    expect(__IS_CLIENT__).toBe(false);
    expect(__LOCAL_HOST__).toBe('localhost');
    expect(__LOCAL_PORT__).toBe(1080);
    expect(__KEY__).toBe('123');
    expect(__TIMEOUT__).toBe(300);
    expect(__LOG_LEVEL__).toBe(DEFAULT_LOG_LEVEL);
  });

});

describe('Config#setUpLogger', function () {

  it('should set log level to DEFAULT_LOG_LEVEL', function () {
    Config.setUpLogger();
    expect(Config.log_level).toBe(DEFAULT_LOG_LEVEL);
  });

  it('should set log level to silly', function () {
    Config.setUpLogger('silly');
    expect(Config.log_level).toBe('silly');
  });

});

describe('Config#abstract', function () {

  it('should return expected object', function () {
    const abstract = Config.abstract();
    expect(abstract).toMatchObject({
      host: 'localhost',
      port: 1080,
      key: '123',
      presets: [{
        name: 'ss-base',
        params: {}
      }],
      timeout: 300
    });
  });

});
