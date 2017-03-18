import fs from 'fs';

const PROFILE_SAMPLE_INTERVAL = 1; // seconds

const now = () => (new Date()).getTime();

export class Profile {

  static _startTime = now();

  static _timer = null;

  static _tmpOut = 0;

  static _outSpeed = 0;

  static _maxOutSpeed = 0;

  static _tmpIn = 0;

  static _inSpeed = 0;

  static _maxInSpeed = 0;

  // ---- public functions

  static start() {
    this._timer = setInterval(() => {
      this._outSpeed = this._tmpOut / PROFILE_SAMPLE_INTERVAL;
      this._inSpeed = this._tmpIn / PROFILE_SAMPLE_INTERVAL;

      this._maxOutSpeed = Math.max(this._maxOutSpeed, this._outSpeed);
      this._maxInSpeed = Math.max(this._maxInSpeed, this._inSpeed);

      this._tmpOut = 0;
      this._tmpIn = 0;
    }, PROFILE_SAMPLE_INTERVAL * 1e3);
  }

  static stop() {
    clearInterval(this._timer);
  }

  static snapshot() {
    const endTime = now();
    const duration = (endTime - this._startTime) / 1e3;
    const totalPackets = this._totalInPackets + this._totalOutPackets;
    const totalBytes = this._totalIn + this._totalOut;
    return {
      sample: {
        from: this._startTime,
        to: endTime,
        duration: endTime - this._startTime,
      },
      instance: {
        outSpeed: this._outSpeed,
        inSpeed: this._inSpeed,
        connections: this._connections,
        errors: this._errors,
        fatals: this._fatals,
        totalOut: this._totalOut,
        totalIn: this._totalIn,
        totalOutPackets: this._totalOutPackets,
        totalInPackets: this._totalInPackets,
        totalBytes,
        totalPackets,
        errorRate: this._errors ? this._errors / totalPackets : 0,
        fatalRate: this._fatals ? this._fatals / totalPackets : 0,
        outBytesRate: this._totalOut / duration,
        outPacketsRate: this._totalOutPackets / duration,
        inBytesRate: this._totalIn / duration,
        inPacketsRate: this._totalInPackets / duration,
        totalBytesRate: totalBytes / duration,
        totalPacketsRate: totalPackets / duration,
      },
      summary: {
        maxOutSpeed: this._maxOutSpeed,
        maxInSpeed: this._maxInSpeed,
        maxConnections: this._maxConnections,
      },
      node: {
        upTime: process.uptime(),
        cpu: process.cpuUsage(),
        memory: process.memoryUsage()
      }
    };
  }

  static save() {
    const dt = new Date();
    const postfix = `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;
    const data = JSON.stringify(this.snapshot(), null, '  ');
    fs.writeFileSync(`blinksocks.profile-${postfix}.log`, data);
  }

  // ---- setters & getters

  // connections

  static _connections = 0;

  static _maxConnections = 0;

  static set connections(value) {
    this._connections = value;
    this._maxConnections = Math.max(this._maxConnections, this._connections);
  }

  static get connections() {
    return this._connections;
  }

  // fatals

  static _fatals = 0;

  static set fatals(value) {
    this._fatals = value;
  }

  static get fatals() {
    return this._fatals;
  }

  // errors

  static _errors = 0;

  static set errors(value) {
    this._errors = value;
  }

  static get errors() {
    return this._errors;
  }

  // out

  static _totalOut = 0;

  static _totalOutPackets = 0;

  static set totalOut(value) {
    this._totalOut = value;
    this._totalOutPackets += 1;
    this._tmpOut += value;
  }

  static get totalOut() {
    return this._totalOut;
  }

  // in

  static _totalIn = 0;

  static _totalInPackets = 0;

  static set totalIn(value) {
    this._totalIn = value;
    this._totalInPackets += 1;
    this._tmpIn += value;
  }

  static get totalIn() {
    return this._totalIn;
  }

}
