import sleep from '../../common/sleep';
import { SpeedTester } from '../../../src/utils';

test('SpeedTester::getSpeed()', async () => {
  const st = new SpeedTester();
  expect(st.getSpeed()).toBe(0);
  st.feed(10);
  await sleep(20);
  expect(st.getSpeed()).toBeGreaterThan(0);
});
