import {AdvancedBuffer} from '../AdvancedBuffer';

describe('AdvancedBuffer#constructor', function () {
  it('should throw when lens is not Array', function () {
    expect(() => new AdvancedBuffer({lens: null})).toThrow();
  });

  it('should throw when lens.length is not 2', function () {
    expect(() => new AdvancedBuffer({lens: [1]})).toThrow();
    expect(() => new AdvancedBuffer({lens: [1, 2, 3]})).toThrow();
  });

  it('should throw when lens[0] < 0', function () {
    expect(() => new AdvancedBuffer({lens: [-1, 0]})).toThrow();
  });

  it('should throw when lens[0] >= lens[1]', function () {
    expect(() => new AdvancedBuffer({lens: [1, 0]})).toThrow();
    expect(() => new AdvancedBuffer({lens: [1, 1]})).toThrow();
  });

  it('should throw when lens range > 6', function () {
    expect(() => new AdvancedBuffer({lens: [0, 7]})).toThrow();
    expect(() => new AdvancedBuffer({lens: [1, 8]})).toThrow();
  });

  it('should throw when getPacketLength not Function', function () {
    expect(() => new AdvancedBuffer({getPacketLength: null})).toThrow();
  });
});

describe('AdvancedBuffer#put', function () {
  it('should throw when pass a non-buffer to put() ', function () {
    const buffer = new AdvancedBuffer();
    expect(() => buffer.put()).toThrow();
  });

  it('should leave one byte', function () {
    const buffer = new AdvancedBuffer();
    const callback = jest.fn();
    buffer.on('data', callback);
    buffer.put(new Buffer([0x00, 0x02])); // emit
    buffer.put(new Buffer([0x00]));
    buffer.put(new Buffer([0x02, 0x00])); // emit
    buffer.put(new Buffer([0x03]));
    buffer.put(new Buffer([0x00, 0xff])); // emit

    expect(buffer.getRest().equals(new Buffer([0xff]))).toBeTruthy();
    expect(callback).toHaveBeenCalledTimes(3);
  });
});

describe('AdvancedBuffer#digest', function () {
  it('should fully digest [0xff, 0x00, 0x03]', function () {
    const buffer = new AdvancedBuffer({
      lens: [1, 2]
    });
    const callback = jest.fn();
    buffer.on('data', callback);

    const data = new Buffer([0xff, 0x00, 0x03]);
    expect(buffer.digest(data).equals(Buffer.from([]))).toBeTruthy();
  });

  it('should fully digest [0x00, 0x02, 0x00, 0x03, 0x04]', function () {
    const buffer = new AdvancedBuffer();
    const callback = jest.fn();
    buffer.on('data', callback);

    const data = new Buffer([0x00, 0x02, 0x00, 0x03, 0x04]);
    expect(buffer.digest(data).equals(Buffer.from([]))).toBeTruthy();

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should not fully digest', function () {
    const buffer = new AdvancedBuffer({
      lens: [1, 2]
    });
    const callback = jest.fn();
    buffer.on('data', callback);

    const data = new Buffer([0xff, 0x00, 0x03, 0x00, 0x00]);
    expect(buffer.digest(data).equals(Buffer.from([0x00, 0x00]))).toBeTruthy();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not digest', function () {
    const buffer = new AdvancedBuffer();
    const callback = jest.fn();
    buffer.on('data', callback);

    const data = new Buffer([0x00, 0x05, 0x03, 0x01]);
    expect(buffer.digest(data).equals(data)).toBeTruthy();
    expect(callback).not.toHaveBeenCalled();
  });
});
