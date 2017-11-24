/**
 * get current utc timestamp
 * @returns {number}
 */
export function getCurrentTimestampInt() {
  return Math.floor(Date.now() / 1e3);
}
