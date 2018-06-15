import { SpeedTester } from '../../../src/core/speed-tester';

test('SpeedTester::getSpeed()', () => {
  const st = new SpeedTester();
  st.feed(10);
  expect(st.getSpeed()).toBeGreaterThan(0);
});
