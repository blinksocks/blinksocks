import {Encapsulator} from '../Encapsulator';
import {Frame} from '../Frame';
import {Address} from '../Address';
import {ATYP_DOMAIN} from '../../proxies/common';

describe('Encapsulator#pack', function () {
  it('should return the expected frame', function () {
    const frame = Encapsulator.pack(new Address(), [0xff, 0xff]);
    expect(frame).toBeInstanceOf(Frame);

    const frame2 = Encapsulator.pack(new Address({ATYP: ATYP_DOMAIN}), [0xff, 0xff]);
    expect(frame2).toBeInstanceOf(Frame);

    expect(frame2.LEN).toEqual([0, 12]);
    expect(frame2.ATYP).toBe(ATYP_DOMAIN);
    expect(frame2.DSTADDR).toEqual([4, 0, 0, 0, 0]);
    expect(frame2.DSTPORT).toEqual([0, 0]);
    expect(frame2.DATA).toEqual([0xff, 0xff]);
  });
});

describe('Encapsulator#unpack', function () {
  it('should return the expected frame', function () {
    const frame = Encapsulator.unpack([0x00, 0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff]);
    expect(frame).toBeInstanceOf(Frame);
  });
});
