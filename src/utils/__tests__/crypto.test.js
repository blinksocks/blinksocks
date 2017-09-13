import * as __module__ from '../crypto';

const tests = [{
  func: 'hash',
  args: ['md5', Buffer.from([1, 2, 3, 4])],
  comparator: (output) => output.equals(Buffer.from('08d6c05a21512a79a1dfeb9d2a8f262f', 'hex'))
}, {
  func: 'hmac',
  args: ['md5', '', Buffer.from([1, 2, 3, 4])],
  comparator: (output) => output.equals(Buffer.from('7f8adea19a1ac02186fa895af72a7fa1', 'hex'))
}, {
  func: 'shake128',
  args: [Buffer.from([1, 2, 3, 4])],
  comparator: (output) => (
    output.nextBytes(1).equals(Buffer.from([0xac])) &&
    output.nextBytes(1).equals(Buffer.from([0xca])) &&
    output.nextBytes(64).length === 64
  )
}, {
  func: 'fnv1a',
  args: [Buffer.from([1, 2, 3, 4])],
  comparator: (output) => output.equals(Buffer.from([0x57, 0x34, 0xa8, 0x7d]))
}, {
  func: 'xor',
  args: [Buffer.from([1, 2, 3]), Buffer.from([4, 5, 6])],
  comparator: (output) => output.equals(Buffer.from([5, 7, 5]))
}, {
  func: 'xor',
  args: [Buffer.from([1, 2]), Buffer.from([4, 5, 6])],
  comparator: (output) => output === null
}, {
  func: 'xor',
  args: [[1, 2, 3], [4, 5, 6]],
  comparator: ([a, b, c]) => a === 5 && b === 7 && c === 5
}, {
  func: 'EVP_BytesToKey',
  args: [Buffer.from('password'), 16, 16],
  comparator: (output) => output.equals(Buffer.from('5f4dcc3b5aa765d61d8327deb882cf99', 'hex'))
}, {
  func: 'HKDF',
  args: ['md5', Buffer.alloc(0), Buffer.from([1, 2, 3, 4]), Buffer.alloc(0), 16],
  comparator: (output) => output.equals(Buffer.from('160ade10f83c4275fca1c8cd0583e4e6', 'hex'))
}];

for (const {func, args, comparator} of tests) {
  test(`${func}() should return expected result`, () => {
    expect(comparator(__module__[func](...args))).toBe(true);
  });
}
