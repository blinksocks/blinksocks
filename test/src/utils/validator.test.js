import { isValidHostname, isValidPort } from '../../../src/utils/validator';

describe('isValidHostname', () => {

  it('non-string should be invalid', () => {
    expect(isValidHostname(null)).toBe(false);
  });

  it('empty string should be invalid', () => {
    expect(isValidHostname('')).toBe(false);
  });

  it('"a." should be invalid', () => {
    expect(isValidHostname('a.')).toBe(false);
  });

  it('domain name with more than 63 bytes should be invalid', () => {
    expect(isValidHostname(`${'a'.repeat(64)}.com`)).toBe(false);
  });

  it('domain name with less than 64 bytes should be valid', () => {
    expect(isValidHostname(`${'a'.repeat(63)}.com`)).toBe(true);
  });

});

describe('isValidPort', () => {

  it('empty string should be invalid', () => {
    expect(isValidPort('')).toBe(false);
  });

  it('-1 should be invalid', () => {
    expect(isValidPort(-1)).toBe(false);
  });

  it('80 should be valid', () => {
    expect(isValidPort(80)).toBe(true);
  });

});
