import Logger from '../logger';

describe('logger', function () {

  it('should return non-null', function () {
    expect(Logger(__filename)).not.toBe(null);
  });

});
