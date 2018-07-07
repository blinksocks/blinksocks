"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
class SpeedTester {
  constructor() {
    this._totalBytes = 0;
    this._lastTime = Date.now();
    this._lastSpeed = 0;
  }

  feed(bytes) {
    this._totalBytes += bytes;
  }

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
exports.SpeedTester = SpeedTester;