import SSStreamCipherPreset from '../ss-stream-cipher';

global.__KEY__ = 'abc';

describe('SSStreamCipherPreset#constructor', function () {

  it('should throw when method is invalid', function () {
    expect(() => new SSStreamCipherPreset({method: null})).toThrow();
    expect(() => new SSStreamCipherPreset({method: ''})).toThrow();
    expect(() => new SSStreamCipherPreset({method: 'xxx'})).toThrow();
  });

  it('should set this._key', function () {
    const preset = new SSStreamCipherPreset({method: 'aes-128-cfb'});
    expect(preset._key).not.toBe(null);
  });

});

describe('SSStreamCipherPreset#beforeOut', function () {
  const preset = new SSStreamCipherPreset({method: 'aes-128-cfb'});

  it('should return 16 bytes', function () {
    expect(
      preset.beforeOut({buffer: Buffer.alloc(0)}).length
    ).toBe(16);
  });

  it('should return 1 byte', function () {
    expect(
      preset.beforeOut({buffer: Buffer.alloc(1)}).length
    ).toBe(1);
  });

});

describe('SSStreamCipherPreset#beforeIn', function () {
  const preset = new SSStreamCipherPreset({method: 'aes-128-cfb'});

  it('should return empty', function () {
    expect(
      preset.beforeIn({buffer: Buffer.alloc(16)}).length
    ).toBe(0);
  });

  it('should return 1 byte', function () {
    expect(
      preset.beforeIn({buffer: Buffer.alloc(1)}).length
    ).toBe(1);
  });

});
