import {AdvancedBuffer} from '../advanced-buffer';

describe('AdvancedBuffer#constructor', function () {

  it('should throw when getPacketLength not Function', function () {
    expect(() => new AdvancedBuffer({getPacketLength: null})).toThrow();
  });

});

describe('AdvancedBuffer#put', function () {

  it('should throw when getPacketLength() return non-number', function () {
    const buffer = new AdvancedBuffer({
      getPacketLength: () => null
    });
    expect(() => buffer.put(Buffer.from([]))).toThrow();
  });

  it('should throw when pass a non-buffer to put() ', function () {
    const buffer = new AdvancedBuffer({
      getPacketLength: () => 0
    });
    expect(() => buffer.put()).toThrow();
  });

  it('should leave 0xff', function () {
    const buffer = new AdvancedBuffer({
      getPacketLength: (chunk) => {
        return (chunk.length < 2) ? 0 : chunk.readUInt16BE(0);
      }
    });
    const callback = jest.fn();
    buffer.on('data', callback);
    buffer.put(Buffer.from([0x00, 0x02])); // emit
    buffer.put(Buffer.from([0x00]));
    buffer.put(Buffer.from([0x02, 0x00])); // emit
    buffer.put(Buffer.from([0x03]));
    buffer.put(Buffer.from([0x00, 0xff])); // emit

    expect(buffer.final().equals(Buffer.from([0xff]))).toBeTruthy();
    expect(callback).toHaveBeenCalledTimes(3);
  });

});
