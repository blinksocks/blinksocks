jest.mock('fs');

import {Config} from '../config';

describe('Config#init', () => {

  // throws

  it('should throw when pass non-object', () => {
    expect(() => Config.init(null)).toThrow();
    expect(() => Config.init([])).toThrow();
  });

  it('should throw when host(if provided) is invalid', () => {
    expect(() => Config.init({})).toThrow();
    expect(() => Config.init({host: ''})).toThrow();
  });

  it('should throw when port(if provided) is invalid', () => {
    expect(() => Config.init({host: 'localhost', port: -1})).toThrow();
  });

  it('should throw when service(if provided) is invalid', () => {
    expect(() => Config.init({service: null})).toThrow();
    expect(() => Config.init({service: 'xxx'})).toThrow();
    expect(() => Config.init({service: 'xxx://abc:1080'})).toThrow();
    expect(() => Config.init({service: 'tcp://-:1080'})).toThrow();
    expect(() => Config.init({service: 'tcp://abc:0'})).toThrow();
    expect(() => Config.init({service: 'tls://abc:1080'})).toThrow();
    expect(() => Config.init({service: 'tls://abc:1080', tls_cert: 'a'})).toThrow();
    expect(() => Config.init({service: 'tls://abc:1080', tls_cert: 'a', tls_key: null})).toThrow();
  });

  it('should throw when servers(if provided) is invalid', () => {
    expect(() => Config.init({host: 'localhost', port: 1080, servers: ''})).toThrow();
    expect(() => Config.init({host: 'localhost', port: 1080, servers: []})).toThrow();
  });

  const baseConf = {
    host: 'localhost',
    port: 1080,
    servers: [{
      enabled: true,
      host: '127.0.0.1',
      port: 1082,
      key: 'abc',
      presets: [{
        name: 'ss-base'
      }]
    }]
  };

  it('should throw when dstaddr(if provided) is invalid', () => {
    expect(() => Config.init({...baseConf, service: 'tcp://localhost:1080', dstaddr: undefined})).toThrow();
    expect(() => Config.init({...baseConf, dstaddr: null})).toThrow();
    expect(() => Config.init({...baseConf, dstaddr: {}})).toThrow();
    expect(() => Config.init({...baseConf, dstaddr: {host: ''}})).toThrow();
    expect(() => Config.init({...baseConf, dstaddr: {host: 'abc'}})).toThrow();
    expect(() => Config.init({...baseConf, dstaddr: {host: 'abc', port: ''}})).toThrow();
    expect(() => Config.init({...baseConf, dstaddr: {host: 'abc', port: 80}})).not.toThrow();
  });

  it('should throw when timeout(if provided) is invalid', () => {
    expect(() => Config.init({...baseConf, timeout: '0'})).toThrow();
    expect(() => Config.init({...baseConf, timeout: 0})).toThrow();
    expect(() => Config.init({...baseConf, timeout: 1})).not.toThrow();
    expect(() => Config.init({...baseConf, timeout: 61})).not.toThrow();
  });

  it('should throw when redirect(if provided) is invalid', () => {
    expect(() => Config.init({...baseConf, redirect: null})).toThrow();
    expect(() => Config.init({...baseConf, redirect: '123'})).toThrow();
    expect(() => Config.init({...baseConf, redirect: '*:80'})).toThrow();
    expect(() => Config.init({...baseConf, redirect: '123:-1'})).toThrow();
    expect(() => Config.init({...baseConf, redirect: 'bing.com:80'})).not.toThrow();
    expect(() => Config.init({...baseConf, redirect: ''})).not.toThrow();
  });

  it('should throw when log_path(if provided) is invalid', () => {
    expect(() => Config.init({...baseConf, log_path: null})).toThrow();
    expect(() => Config.init({...baseConf, log_path: ''})).not.toThrow();
  });

  it('should throw when log_level(if provided) is invalid', () => {
    expect(() => Config.init({...baseConf, log_level: 'xxx'})).toThrow();
  });

  it('should throw when log_max_days(if provided) is invalid', () => {
    expect(() => Config.init({...baseConf, log_max_days: 'xxx'})).toThrow();
    expect(() => Config.init({...baseConf, log_max_days: 0})).toThrow();
  });

  it('should throw when workers(if provided) is invalid', () => {
    expect(() => Config.init({...baseConf, workers: '0'})).toThrow();
    expect(() => Config.init({...baseConf, workers: -1})).toThrow();
    expect(() => Config.init({...baseConf, workers: 0})).not.toThrow();
    expect(() => Config.init({...baseConf, workers: 100})).not.toThrow();
  });

  it('should throw when dns(is provided) is invalid', () => {
    expect(() => Config.init({...baseConf, dns: null})).toThrow();
    expect(() => Config.init({...baseConf, dns: ['']})).toThrow();
    expect(() => Config.init({...baseConf, dns: ['localhost']})).toThrow();
    expect(() => Config.init({...baseConf, dns: []})).not.toThrow();
    expect(() => Config.init({...baseConf, dns: ['8.8.8.8']})).not.toThrow();
  });

  it('should throw when dns_expire(is provided) is invalid', () => {
    expect(() => Config.init({...baseConf, dns_expire: '0'})).toThrow();
    expect(() => Config.init({...baseConf, dns_expire: -1})).toThrow();
    expect(() => Config.init({...baseConf, dns_expire: 24 * 60 * 60})).not.toThrow();
    expect(() => Config.init({...baseConf, dns_expire: 24 * 60 * 60 + 1})).not.toThrow();
  });

  // others

  it('should __IS_SERVER__ set to true, if no servers provided', () => {
    Config.init({host: 'localhost', port: 1080, key: 'abc', presets: [{name: 'ss-base'}]});
    expect(__IS_SERVER__).toBe(true);
  });

  it('should __IS_CLIENT__ set to true, if servers provided', () => {
    Config.init(baseConf);
    expect(__IS_CLIENT__).toBe(true);
  });

  it('should __LOG_PATH__ endsWith blinksocks.log', () => {
    Config.init({...baseConf, log_path: 'blinksocks.log'});
    expect(__LOG_PATH__.endsWith('blinksocks.log')).toBe(true);
  });

  it('should __LOG_LEVEL__ set to warn', () => {
    Config.init({...baseConf, log_level: 'warn'});
    expect(__LOG_LEVEL__).toBe('warn');
  });

  it('should __LOG_MAX_DAYS__ set to 30', () => {
    Config.init({...baseConf, log_max_days: 30});
    expect(__LOG_MAX_DAYS__).toBe(30);
  });

});

describe('Config#_validateServer', () => {

  it('should throw when server.host(is provided) is invalid', () => {
    expect(() => Config._validateServer({host: null})).toThrow();
    expect(() => Config._validateServer({host: ''})).toThrow();
  });

  it('should throw when server.port(is provided) is invalid', () => {
    expect(() => Config._validateServer({host: 'abc', port: null})).toThrow();
  });

  it('should throw when server.key is invalid', () => {
    expect(() => Config._validateServer({host: 'abc', port: 123, key: null})).toThrow();
    expect(() => Config._validateServer({host: 'abc', port: 123, key: ''})).toThrow();
  });

  let baseConf = {service: 'tcp://abc:123', key: 'secret'};

  it('should throw when server.presets is not an array', () => {
    expect(() => Config._validateServer({...baseConf, presets: null})).toThrow();
  });

  it('should throw when server.presets is empty', () => {
    expect(() => Config._validateServer({...baseConf, presets: []})).toThrow();
  });

  it('should throw when server.preset[].name is invalid', () => {
    expect(() => Config._validateServer({...baseConf, presets: [{}]})).toThrow();
    expect(() => Config._validateServer({...baseConf, presets: [{name: ''}]})).toThrow();
  });

  it('should not throw when server.preset[].params(if provided) is invalid', () => {
    expect(() => Config._validateServer({...baseConf, presets: [{name: 'ss-base', params: ''}]})).toThrow();
    expect(() => Config._validateServer({...baseConf, presets: [{name: 'ss-base', params: []}]})).toThrow();
    expect(() => Config._validateServer({...baseConf, presets: [{name: 'ss-base', params: null}]})).toThrow();
    expect(() => Config._validateServer({...baseConf, presets: [{name: 'ss-base', params: {}}]})).not.toThrow();
  });

  baseConf = {...baseConf, presets: [{name: 'ss-base'}]};

  it('should throw when server.transport(if provided) is invalid', () => {
    expect(() => Config._validateServer({...baseConf, transport: null})).toThrow();
    expect(() => Config._validateServer({...baseConf, transport: 'tcp'})).not.toThrow();
  });

  it('should throw when server.transport is set to "tls" but "tls_cert" is invalid', () => {
    expect(() => Config._validateServer({...baseConf, transport: 'tls'})).toThrow();
    expect(() => Config._validateServer({...baseConf, transport: 'tls', tls_cert: null})).toThrow();
    expect(() => Config._validateServer({...baseConf, transport: 'tls', tls_cert: ''})).toThrow();
    expect(() => Config._validateServer({...baseConf, transport: 'tls', tls_cert: 'abc'})).not.toThrow();
  });

  it('should __TRANSPORT__ set to tcp', () => {
    Config.init({...baseConf, transport: 'tcp'});
    expect(__TRANSPORT__).toBe('tcp');
  });

  it('__TLS_CERT__ and __TLS_KEY__ should be set', () => {
    Config.init({...baseConf, service: 'tls://abc:123', tls_cert: 'mock_cert.pem', tls_key: 'mock_key.pem'});
    expect(__TRANSPORT__).toBe('tls');
    expect(__TLS_CERT__).toBeDefined();
    expect(__TLS_KEY__).toBeDefined();
  });

});
