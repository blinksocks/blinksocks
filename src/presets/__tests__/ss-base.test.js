import {numberToBuffer} from '../../utils';
import SSBasePreset from '../ss-base';

describe('SSBasePreset#constructor', function () {

  it('should initialize address correctly', function () {
    global.__IS_CLIENT__ = true;
    const preset = new SSBasePreset({
      type: 3,
      host: 'example.com',
      port: numberToBuffer(1080)
    });
    expect(preset._atyp).toBe(3);
    expect(preset._host.equals(Buffer.from([101, 120, 97, 109, 112, 108, 101, 46, 99, 111, 109]))).toBe(true);
    expect(preset._port.equals(Buffer.from([4, 56]))).toBe(true);
  });

  it('should initialize address correctly', function () {
    global.__IS_CLIENT__ = true;
    const preset = new SSBasePreset({
      type: 1,
      host: '192.168.1.1',
      port: numberToBuffer(80)
    });
    expect(preset._atyp).toBe(1);
    expect(preset._host.equals(Buffer.from('c0a80101', 'hex'))).toBe(true);
    expect(preset._port.equals(Buffer.from('0050', 'hex'))).toBe(true);
  });

});

describe('SSBasePreset#clientOut', function () {
  global.__IS_CLIENT__ = true;
  const preset = new SSBasePreset({
    type: 1,
    host: Buffer.from('example.com'),
    port: numberToBuffer(1080)
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
    broadcast: jest.fn(({payload: {onConnected}}) => {
      onConnected();
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
        0x04, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0
      ])
    });
    expect(params.broadcast).toHaveBeenCalled();
  });

  it('should call broadcast domain', function () {
    global.__IS_CLIENT__ = false;
    const preset = new SSBasePreset();
    preset.serverIn({
      ...params, buffer: Buffer.from([
        0x03, 0x0b, ...Buffer.from('example.com'),
        0, 0
      ])
    });
    expect(params.broadcast).toHaveBeenCalled();

    expect(
      preset.serverIn({...params, buffer: Buffer.alloc(1)}).length
    ).toBe(1);
  });

  it('should call fail if domain is invalid', function () {
    global.__IS_CLIENT__ = false;
    const preset = new SSBasePreset();
    preset.serverIn({
      ...params, buffer: Buffer.from([
        0x03, 0x0c, ...Buffer.from('=example.com'),
        0, 0
      ])
    });
    expect(params.fail).toHaveBeenCalled();
  });

});
