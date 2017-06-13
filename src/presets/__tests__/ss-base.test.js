import {numberToBuffer} from '../../utils';
import SSBasePreset from '../ss-base';

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
