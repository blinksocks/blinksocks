export class Performance {

  _hub = null;

  _prevHrtime = process.hrtime();

  _prevTotalRead = 0;

  _prevTotalWritten = 0;

  constructor(hub) {
    this._hub = hub;
  }

  getUploadSpeed() {
    const [sec, nano] = process.hrtime(this._prevHrtime);
    const totalWritten = this._hub.getTotalWritten();
    const diff = totalWritten - this._prevTotalWritten;
    const speed = Math.ceil(diff / (sec + nano / 1e9)); // b/s
    this._prevTotalWritten = totalWritten;
    return speed;
  }

  getDownloadSpeed() {
    const [sec, nano] = process.hrtime(this._prevHrtime);
    const totalRead = this._hub.getTotalRead();
    const diff = totalRead - this._prevTotalRead;
    const speed = Math.ceil(diff / (sec + nano / 1e9)); // b/s
    this._prevTotalRead = totalRead;
    return speed;
  }

}
