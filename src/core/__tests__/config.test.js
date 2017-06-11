jest.mock('fs');

import {Config} from '../config';

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
          transport: 'tcp',
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
      transport: 'tcp',
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

  it('should throw when dns is provided but invalid', function () {
    const conf = {
      transport: 'tcp',
      host: 'localhost',
      port: 1080,
      key: 'abc',
      presets: [{name: 'ss-base', params: {}}],
      timeout: 600
    };
    expect(() => Config.init({...conf, dns: null})).toThrow();
    expect(() => Config.init({...conf, dns: ['']})).toThrow();
    expect(() => Config.init({...conf, dns: ['localhost']})).toThrow();

    expect(() => Config.init({...conf, dns: []})).not.toThrow();
    expect(() => Config.init({...conf, dns: ['8.8.8.8']})).not.toThrow();
  });

  // others

  it('should __IS_SERVER__ set to true, if no servers provided', function () {
    Config.init({
      transport: 'tcp',
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

  it('should __IS_CLIENT__ set to true, if servers provided', function () {
    Config.init({
      host: 'localhost',
      port: 1080,
      servers: [{
        enabled: true,
        transport: 'tcp',
        host: 'localhost',
        port: 1081,
        key: 'abc',
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
      timeout: 300
    });
    expect(__IS_CLIENT__).toBe(true);
  });

});

describe('Config#initServer', function () {

  it('should throw when server.transport is not string', function () {
    expect(() => Config.initServer({transport: null})).toThrow();
  });

  it('should throw when server.transport is not \"tcp\" or \"udp\"', function () {
    expect(() => Config.initServer({transport: ''})).toThrow();
  });

  it('should throw when server.host is not string', function () {
    expect(() => Config.initServer({transport: 'tcp', host: null})).toThrow();
  });

  it('should throw when server.host is empty', function () {
    expect(() => Config.initServer({transport: 'tcp', host: ''})).toThrow();
  });

  it('should throw when server.port is not string', function () {
    expect(() => Config.initServer({transport: 'tcp', host: 'abc', port: null})).toThrow();
  });

  it('should throw when server.port is empty', function () {
    expect(() => Config.initServer({transport: 'tcp', host: 'abc', port: ''})).toThrow();
  });

  it('should throw when server.key is not string', function () {
    expect(() => Config.initServer({transport: 'tcp', host: 'abc', port: 123, key: null})).toThrow();
  });

  it('should throw when server.key is empty', function () {
    expect(() => Config.initServer({transport: 'tcp', host: 'abc', port: 123, key: ''})).toThrow();
  });

  it('should throw when server.presets is not an array', function () {
    expect(() => Config.initServer({transport: 'tcp', host: 'abc', port: 123, key: 'secret', presets: null})).toThrow();
  });

  it('should throw when server.presets is empty', function () {
    expect(() => Config.initServer({transport: 'tcp', host: 'abc', port: 123, key: 'secret', presets: []})).toThrow();
  });

  it('should throw when server.preset[].name is not present', function () {
    expect(function () {
      Config.initServer({
        transport: 'tcp',
        host: 'abc',
        port: 123,
        key: 'secret',
        presets: [{}]
      });
    }).toThrow();
  });

  it('should throw when server.preset[].name is empty', function () {
    expect(function () {
      Config.initServer({
        transport: 'tcp',
        host: 'abc',
        port: 123,
        key: 'secret',
        presets: [{
          name: '',
          params: {}
        }]
      });
    }).toThrow();
  });

  it('should throw when server.preset[].params is not an object', function () {
    expect(function () {
      Config.initServer({
        transport: 'tcp',
        host: 'abc',
        port: 123,
        key: 'secret',
        presets: [{
          name: 'a',
          params: ''
        }]
      });
    }).toThrow();
  });

});
