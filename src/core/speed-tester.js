export class SpeedTester {

  totalBytes = 0;

  lastTime = Date.now();

  feed(bytes) {
    this.totalBytes += bytes;
  }

  /**
   * return speed in byte/s
   * @returns {number}
   */
  getSpeed() {
    const now = Date.now();
    const timeDiff = now - this.lastTime;
    const speed = this.totalBytes / (timeDiff / 1e3);
    this.lastTime = now;
    this.totalBytes = 0;
    return speed;
  }

}
