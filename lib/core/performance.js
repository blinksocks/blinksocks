"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
class Performance {

  constructor(hub) {
    this._hub = null;
    this._prevHrtime = process.hrtime();
    this._prevTotalRead = 0;
    this._prevTotalWritten = 0;

    this._hub = hub;
  }

  getUploadSpeed() {
    const [sec, nano] = process.hrtime(this._prevHrtime);
    const totalWritten = this._hub.getTotalWritten();
    const diff = totalWritten - this._prevTotalWritten;
    const speed = Math.ceil(diff / (sec + nano / 1e9));
    this._prevTotalWritten = totalWritten;
    return speed;
  }

  getDownloadSpeed() {
    const [sec, nano] = process.hrtime(this._prevHrtime);
    const totalRead = this._hub.getTotalRead();
    const diff = totalRead - this._prevTotalRead;
    const speed = Math.ceil(diff / (sec + nano / 1e9));
    this._prevTotalRead = totalRead;
    return speed;
  }

}
exports.Performance = Performance;