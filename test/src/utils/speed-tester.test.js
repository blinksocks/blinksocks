import { SpeedTester } from '../../../src/utils';

test('SpeedTester::getSpeed()', () => {
  const st = new SpeedTester();
  st.feed(10);
  expect(st.getSpeed()).toBeGreaterThan(0);
});
