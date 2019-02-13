"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SpeedTester = void 0;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class SpeedTester {
  constructor() {
    _defineProperty(this, "_totalBytes", 0);

    _defineProperty(this, "_lastTime", Date.now());

    _defineProperty(this, "_lastSpeed", 0);
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