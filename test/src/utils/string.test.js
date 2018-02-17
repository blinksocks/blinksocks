import { kebabCase, dumpHex } from '../../../src/utils/string';

it('should return kebab-cased string', () => {
  expect(kebabCase('AbcDef')).toBe('abc-def');
});

it('should return hex string', () => {
  expect(dumpHex(Buffer.alloc(5))).toBe('0000000000');
  expect(dumpHex(Buffer.alloc(5), 5)).toBe('0000000000');
  expect(dumpHex(Buffer.alloc(5), 4)).toBe('00000000...');
});
