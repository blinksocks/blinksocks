import {Encapsulator, Frame} from '../Encapsulator';
import {Connection} from '../Connection';
import {
  ATYP_DOMAIN
} from '../../socks5/Constants';

describe('Encapsulator#numberToArray', function () {
  it('should return [0x01, 0x01] when pass 257', function () {
    expect(Encapsulator.numberToArray(257)).toEqual([0x01, 0x01]);
  });
});

describe('Encapsulator#pack', function () {
  it('should return the expected frame', function () {
    const frame = Encapsulator.pack(new Connection(), [0xff, 0xff]);
    expect(frame).toBeInstanceOf(Frame);

    const frame2 = Encapsulator.pack(new Connection({ATYP: ATYP_DOMAIN}), [0xff, 0xff]);
    expect(frame2).toBeInstanceOf(Frame);

    expect(frame2.LEN).toEqual([0, 12]);
    expect(frame2.ATYP).toBe(ATYP_DOMAIN);
    expect(frame2.DSTADDR).toEqual([4, 0, 0, 0, 0]);
    expect(frame2.DSTPORT).toEqual([0, 0]);
    expect(frame2.PAYLOAD).toEqual([0xff, 0xff]);
  });
});

describe('Encapsulator#unpack', function () {
  it('should return the expected frame', function () {
    const frame = Encapsulator.unpack([0x00, 0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff]);
    expect(frame).toBeInstanceOf(Frame);
  });
});
