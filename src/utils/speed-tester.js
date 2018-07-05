export class SpeedTester {

  _totalBytes = 0;

  _lastTime = Date.now();

  _lastSpeed = 0;

  /**
   * put some bytes to measure later
   * @param bytes
   */
  feed(bytes) {
    this._totalBytes += bytes;
  }

  /**
   * return speed in byte/s
   * @returns {number}
   */
  getSpeed() {
    const now = Date.now();
    const timeDiff = now - this._lastTime;
    if (timeDiff > 0) {
      const speed = this._totalBytes / (timeDiff / 1e3);
      this._lastTime = now;
      this._lastSpeed = speed;
      this._totalBytes = 0;
      return speed;
    } else {
      return this._lastSpeed;
    }
  }

}
