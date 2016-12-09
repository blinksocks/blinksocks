import {Frame} from '../Encapsulator';

describe('Frame#constructor', function () {

  it('should return expected buffer', function () {
    const frame = new Frame();
    const buffer = Buffer.from([0, 0, 1, 0, 0, 0, 0, 0, 0]);
    expect(frame.toBuffer().equals(buffer)).toBe(true);
  });

});

describe('Frame#parse', function () {

  it('should return null if buffer.length < 9', function () {
    expect(Frame.parse([0])).toBe(null);
  });

  it('should return null if buffer.length != LEN', function () {
    expect(Frame.parse([0, 9, 0x01, 0, 0, 0, 0, 0, 0, 0xff])).toBe(null);
  });

  it('should return null if ATYP is invalid', function () {
    expect(Frame.parse([0, 9, 0, 0, 0, 0, 0, 0, 0])).toBe(null);
  });

  it('should return null if domain length is wrong', function () {
    expect(Frame.parse([0, 9, 0x03, 10, 0, 0, 0, 0, 0])).toBe(null);
  });

  it('should return null if ipv6\'s length is less than 21', function () {
    expect(Frame.parse([
      0, 20, 0x04, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ])).toBe(null);
  });

  it('should return non-null', function () {
    expect(Frame.parse([0, 9, 0x03, 3, 1, 2, 3, 0, 0])).not.toBe(null);
    expect(Frame.parse([
      0, 22, 0x04, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0
    ])).not.toBe(null);
  });

});
