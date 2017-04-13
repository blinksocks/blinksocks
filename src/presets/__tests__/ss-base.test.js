import SSBasePreset from '../ss-base';

describe('SSBasePreset#constructor', function () {

  it('should initialize address correctly', function () {
    global.__IS_CLIENT__ = true;
    const preset = new SSBasePreset({
      type: 1,
      host: 'example.com',
      port: 1080
    });
    expect(preset._atyp).toBe(1);
    expect(preset._addr.equals(Buffer.from([101, 120, 97, 109, 112, 108, 101, 46, 99, 111, 109]))).toBe(true);
    expect(preset._port.equals(Buffer.from([4, 56]))).toBe(true);
  });

});

describe('SSBasePreset#clientOut', function () {
  global.__IS_CLIENT__ = true;
  const preset = new SSBasePreset({
    type: 1,
    host: 'example.com',
    port: 1080
  });

  it('should return more than 1 byte', function () {
    expect(
      preset.clientOut({buffer: Buffer.alloc(1)}).length
    ).toBeGreaterThan(1);
  });

  it('should return only 1 byte', function () {
    expect(
      preset.clientOut({buffer: Buffer.alloc(1)}).length
    ).toBe(1);
  });

});

describe('SSBasePreset#serverIn', function () {
  const params = {
    next: jest.fn(),
    broadcast: jest.fn(({payload}) => {
      payload[1]();
      expect(params.next).toHaveBeenCalled();
    }),
    fail: jest.fn()
  };

  it('should call fail', function () {
    global.__IS_CLIENT__ = false;
    const preset = new SSBasePreset();
    preset.serverIn({...params, buffer: Buffer.alloc(0)});
    preset.serverIn({...params, buffer: Buffer.alloc(7)});
    preset.serverIn({...params, buffer: Buffer.alloc(8)});
    preset.serverIn({...params, buffer: Buffer.from([0x04, 0, 0, 0, 0, 0, 0, 0])});
    preset.serverIn({...params, buffer: Buffer.from([0x03, 0x05, 0, 0, 0, 0, 0, 0])});
    expect(params.fail).toHaveBeenCalledTimes(5);
  });

  it('should call broadcast ipv4', function () {
    global.__IS_CLIENT__ = false;
    const preset = new SSBasePreset();
    preset.serverIn({
      ...params, buffer: Buffer.from([
        0x01, 0x05, 0, 0, 0, 0, 0, 0
      ])
    });
    expect(params.broadcast).toHaveBeenCalled();
  });

  it('should call broadcast ipv6', function () {
    global.__IS_CLIENT__ = false;
    const preset = new SSBasePreset();
    preset.serverIn({
      ...params, buffer: Buffer.from([
        0x04, 0x05, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0
      ])
    });
    expect(params.broadcast).toHaveBeenCalled();
  });

  it('should return 1 byte', function () {
    global.__IS_CLIENT__ = false;
    const preset = new SSBasePreset();
    preset.serverIn({...params, buffer: Buffer.from([0x03, 0x05, 0, 0, 0, 0, 0, 0, 0])});
    expect(preset.serverIn({...params, buffer: Buffer.alloc(1)}).length).toBe(1);
  });
});

describe('SSBasePreset#serverOut', function () {
  global.__IS_CLIENT__ = false;
  const preset = new SSBasePreset();

  it('should return only 1 byte', function () {
    expect(
      preset.serverOut({buffer: Buffer.alloc(1)}).length
    ).toBe(1);
  });
});

describe('v#clientIn', function () {
  global.__IS_CLIENT__ = true;
  const preset = new SSBasePreset({
    type: 1,
    host: 'example.com',
    port: 1080
  });

  it('should return only 1 byte', function () {
    expect(
      preset.clientIn({buffer: Buffer.alloc(1)}).length
    ).toBe(1);
  });
});
