"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
class SpeedTester {
  constructor() {
    this.totalBytes = 0;
    this.lastTime = Date.now();
  }

  feed(bytes) {
    this.totalBytes += bytes;
  }

  getSpeed() {
    const now = Date.now();
    const timeDiff = now - this.lastTime;
    const speed = this.totalBytes / (timeDiff / 1e3);
    this.lastTime = now;
    this.totalBytes = 0;
    return speed;
  }

}
exports.SpeedTester = SpeedTester;