/**
 * get current utc timestamp
 * @returns {number}
 */
export function getCurrentTimestampInt() {
  return Math.floor((new Date()).getTime() / 1e3);
}
