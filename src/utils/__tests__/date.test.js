import {getCurrentTimestampInt} from '../date';

test('getCurrentTimestampInt() should return an integer', () => {
  expect(Number.isInteger(getCurrentTimestampInt())).toBe(true);
});
