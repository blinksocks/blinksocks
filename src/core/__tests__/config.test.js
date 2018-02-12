jest.mock('fs');

import {Config} from '../config';

describe('Config#test', () => {

  it('should throw when pass non-plain object', () => {
    expect(() => Config.test(null)).toThrow();
    expect(() => Config.test([])).toThrow();
  });

  it('should throw when service is not provided', () => {
    expect(() => Config.test({})).toThrow();
  });

  it('should throw when service is invalid', () => {
    expect(() => Config.test({service: null})).toThrow();
    expect(() => Config.test({service: 'xxx'})).toThrow();
    expect(() => Config.test({service: 'xxx://abc:1080'})).toThrow();
    expect(() => Config.test({service: 'tcp://-:1080'})).toThrow();
    expect(() => Config.test({service: 'tcp://abc:0'})).toThrow();
    expect(() => Config.test({service: 'tls://abc:1080'})).toThrow();
    expect(() => Config.test({service: 'tls://abc:1080', tls_cert: 'a'})).toThrow();
    expect(() => Config.test({service: 'tls://abc:1080', tls_cert: 'a', tls_key: null})).toThrow();
  });

  const baseConf = {
    service: 'http://localhost:1080',
    servers: [{
      enabled: true,
      service: 'tcp://127.0.0.1:1082',
      key: 'abc',
      presets: [{
        name: 'ss-base'
      }]
    }]
  };

  it('should throw when ?forward is invalid', () => {
    expect(() => Config.test({...baseConf, service: 'tcp://localhost:1080'})).toThrow();
    expect(() => Config.test({...baseConf, service: 'tcp://localhost:1080?forward'})).toThrow();
    expect(() => Config.test({...baseConf, service: 'tcp://localhost:1080?forward=???'})).toThrow();
    expect(() => Config.test({...baseConf, service: 'tcp://localhost:1080?forward=127.0.0.1'})).toThrow();
    expect(() => Config.test({...baseConf, service: 'tcp://localhost:1080?forward=127.0.0.1:-1'})).toThrow();
    expect(() => Config.test({...baseConf, service: 'tcp://localhost:1080?forward=127.0.0.1:1083'})).not.toThrow();
  });

  it('should throw when timeout(if provided) is invalid', () => {
    expect(() => Config.test({...baseConf, timeout: '0'})).toThrow();
    expect(() => Config.test({...baseConf, timeout: 0})).toThrow();
    expect(() => Config.test({...baseConf, timeout: 1})).not.toThrow();
    expect(() => Config.test({...baseConf, timeout: 61})).not.toThrow();
  });

  it('should throw when log_path(if provided) is invalid', () => {
    expect(() => Config.test({...baseConf, log_path: null})).toThrow();
    expect(() => Config.test({...baseConf, log_path: ''})).not.toThrow();
  });

  it('should throw when log_level(if provided) is invalid', () => {
    expect(() => Config.test({...baseConf, log_level: 'xxx'})).toThrow();
    expect(() => Config.test({...baseConf, log_level: 'info'})).not.toThrow();
  });

  it('should throw when log_max_days(if provided) is invalid', () => {
    expect(() => Config.test({...baseConf, log_max_days: 'xxx'})).toThrow();
    expect(() => Config.test({...baseConf, log_max_days: 0})).toThrow();
    expect(() => Config.test({...baseConf, log_max_days: 1})).not.toThrow();
  });

  it('should throw when workers(if provided) is invalid', () => {
    expect(() => Config.test({...baseConf, workers: '0'})).toThrow();
    expect(() => Config.test({...baseConf, workers: -1})).toThrow();
    expect(() => Config.test({...baseConf, workers: 0})).not.toThrow();
    expect(() => Config.test({...baseConf, workers: 100})).not.toThrow();
  });

  it('should throw when dns(is provided) is invalid', () => {
    expect(() => Config.test({...baseConf, dns: null})).toThrow();
    expect(() => Config.test({...baseConf, dns: ['']})).toThrow();
    expect(() => Config.test({...baseConf, dns: ['localhost']})).toThrow();
    expect(() => Config.test({...baseConf, dns: []})).not.toThrow();
    expect(() => Config.test({...baseConf, dns: ['8.8.8.8']})).not.toThrow();
  });

  it('should throw when dns_expire(is provided) is invalid', () => {
    expect(() => Config.test({...baseConf, dns_expire: '0'})).toThrow();
    expect(() => Config.test({...baseConf, dns_expire: -1})).toThrow();
    expect(() => Config.test({...baseConf, dns_expire: 24 * 60 * 60})).not.toThrow();
    expect(() => Config.test({...baseConf, dns_expire: 24 * 60 * 60 + 1})).not.toThrow();
  });

});

describe('Config#testOnClient', () => {

  it('should throw when servers is invalid', () => {
    expect(() => Config.testOnClient({service: 'http://localhost:1080', servers: ''})).toThrow();
    expect(() => Config.testOnClient({service: 'http://localhost:1080', servers: []})).toThrow();
  });

  const baseConf = {
    servers: [{
      enabled: true,
      service: 'tcp://127.0.0.1:1082',
      key: 'abc',
      presets: [{
        name: 'ss-base'
      }]
    }]
  };

  it('should throw when service is not provided', () => {
    expect(() => Config.testOnClient({...baseConf})).toThrow();
  });

  it('should throw when service is invalid', () => {
    expect(() => Config.testOnClient({...baseConf, service: 'xxx'})).toThrow();
    expect(() => Config.testOnClient({...baseConf, service: 'ws://'})).toThrow();
    expect(() => Config.testOnClient({...baseConf, service: 'tcp://?'})).toThrow();
    expect(() => Config.testOnClient({...baseConf, service: 'tcp://abc'})).toThrow();
    expect(() => Config.testOnClient({...baseConf, service: 'http://abc:1'})).not.toThrow();
  });

});

describe('Config#testOnServer', () => {

  let baseConf = {service: 'tcp://abc:123'};

  it('should throw when server.key is invalid', () => {
    expect(() => Config.testOnServer({...baseConf, key: null})).toThrow();
    expect(() => Config.testOnServer({...baseConf, key: ''})).toThrow();
    expect(() => Config.testOnServer({...baseConf, key: 'a'})).not.toThrow();
  });

  baseConf = {service: 'tcp://abc:123', key: 'secret'};

  it('should throw when server.presets is not an array', () => {
    expect(() => Config.testOnServer({...baseConf, presets: null})).toThrow();
  });

  it('should throw when server.presets is empty', () => {
    expect(() => Config.testOnServer({...baseConf, presets: []})).toThrow();
  });

  it('should throw when server.preset[].name is invalid', () => {
    expect(() => Config.testOnServer({...baseConf, presets: [{}]})).toThrow();
    expect(() => Config.testOnServer({...baseConf, presets: [{name: ''}]})).toThrow();
  });

  it('should not throw when server.preset[].params(if provided) is invalid', () => {
    expect(() => Config.testOnServer({...baseConf, presets: [{name: 'ss-base', params: ''}]})).toThrow();
    expect(() => Config.testOnServer({...baseConf, presets: [{name: 'ss-base', params: []}]})).toThrow();
    expect(() => Config.testOnServer({...baseConf, presets: [{name: 'ss-base', params: null}]})).toThrow();
    expect(() => Config.testOnServer({...baseConf, presets: [{name: 'ss-base', params: {}}]})).not.toThrow();
  });

  baseConf = {service: 'tcp://abc:123', key: 'secret', presets: [{name: 'ss-base'}]};

  it('should throw when redirect(if provided) is invalid', () => {
    expect(() => Config.testOnServer({...baseConf, redirect: null})).toThrow();
    expect(() => Config.testOnServer({...baseConf, redirect: '123'})).toThrow();
    expect(() => Config.testOnServer({...baseConf, redirect: '*:80'})).toThrow();
    expect(() => Config.testOnServer({...baseConf, redirect: '123:-1'})).toThrow();
    expect(() => Config.testOnServer({...baseConf, redirect: 'bing.com:80'})).not.toThrow();
    expect(() => Config.testOnServer({...baseConf, redirect: ''})).not.toThrow();
  });

  it('should throw when mux(if provided) is invalid', () => {
    expect(() => Config.testOnServer({...baseConf, mux: null})).toThrow();
    expect(() => Config.testOnServer({...baseConf, mux: true})).not.toThrow();
  });

});

describe('Config#init', () => {

  const clientConf = {
    service: 'tcp://localhost:1080?forward=localhost:1083',
    key: 'abc',
    presets: [{name: 'ss-base'}],
    servers: [{
      enabled: true,
      service: 'tcp://127.0.0.1:1082',
      key: 'abc',
      presets: [{
        name: 'ss-base'
      }]
    }],
    dns: ['8.8.8.8'],
    log_level: 'warn',
    log_path: 'blinksocks.log',
    log_max_days: 30
  };

  it('should ctx set correctly', () => {
    const ctx = Config.init(clientConf);
    expect(ctx.LOCAL_PROTOCOL).toBe('tcp');
    expect(ctx.LOCAL_HOST).toBe('localhost');
    expect(ctx.LOCAL_PORT).toBe(1080);
    expect(ctx.IS_CLIENT).toBe(true);
    expect(ctx.IS_SERVER).toBe(false);
    expect(ctx.SERVERS.length).toBe(1);
    expect(ctx.TIMEOUT).toBe(600 * 1e3);
    expect(ctx.WORKERS).toBe(0);
    expect(ctx.LOG_LEVEL).toBe('warn');
    expect(ctx.LOG_PATH.endsWith('blinksocks.log')).toBe(true);
    expect(ctx.LOG_MAX_DAYS).toBe(30);
  });

});

describe('Config#initServer', () => {

  const serverConf = {
    service: 'tls://127.0.0.1:1082',
    key: 'abc',
    presets: [{
      name: 'ss-base'
    }],
    tls_cert: 'mock_cert.pem',
    tls_key: 'mock_key.pem'
  };

  it('should globals set correctly', () => {
    const ctx = Config.init(serverConf);
    expect(ctx.TRANSPORT).toBe('tls');
    expect(ctx.TLS_CERT).toBeDefined();
    expect(ctx.TLS_KEY).toBeDefined();
  });

});
