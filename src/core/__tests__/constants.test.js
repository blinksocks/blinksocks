import path from 'path';

beforeEach(function () {
  process.env.RUN_AS = 'client';
});

describe('require', function () {

  it('should not throw any errors when require the module', function () {
    expect(() => require('../constants')).not.toThrow();
  });

  it('LOG_FILE_PATH should be blinksocks-client.log when RUN_AS is set to client', function () {
    delete require.cache[require.resolve('../constants')];
    const logPath = require('../constants').LOG_FILE_PATH;
    expect(path.basename(logPath)).toBe('blinksocks-client.log');
  });

});
