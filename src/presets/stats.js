import fs from 'fs';
import path from 'path';
import {IPresetStatic, PRESET_FAILED, CONNECTION_CLOSED, CONNECTION_CREATED} from './defs';

const now = () => (new Date()).getTime();

const DEFAULT_SAMPLE_INTERVAL = 30;
const DEFAULT_SAVE_INTERVAL = 60;

/**
 * @description
 *   Perform statistics among traffic via this preset
 *
 * @params
 *   save_to: Where to store stats result.
 *   sample_interval(optional): The sample interval in seconds.
 *   save_interval(optional): The save interval in seconds.
 *
 * @examples
 *   {
 *     "name": "stats",
 *     "params": {
 *       "save_to": "stats.json",
 *       "sample_interval": 30,
 *       "save_interval": 60
 *     }
 *   }
 */
export default class StatsPreset extends IPresetStatic {

  sampleInterval = DEFAULT_SAMPLE_INTERVAL; // seconds

  saveInterval = DEFAULT_SAVE_INTERVAL; // seconds

  saveTo = '';

  sampleTimer = null;

  saveTimer = null;

  // statistics

  startedAt = now();

  totalOutBytes = 0;

  totalInBytes = 0;

  totalOutPackets = 0;

  totalInPackets = 0;

  totalErrors = 0;

  totalConnections = 0;

  // calculated

  instantOutSpeed = 0;

  instantInSpeed = 0;

  maxOutSpeed = 0;

  maxInSpeed = 0;

  maxConnections = 0;

  // temporary

  tmpOut = 0;

  tmpIn = 0;

  static checkParams({save_to, sample_interval = DEFAULT_SAMPLE_INTERVAL, save_interval = DEFAULT_SAVE_INTERVAL}) {
    // save_to
    if (typeof save_to !== 'string' || save_to === '') {
      throw Error('\'save_to\' must be a non-empty string');
    }
    // sample_interval
    if (typeof sample_interval === 'undefined') {
      throw Error('\'sample_interval\' must be provided as an integer');
    }
    if (typeof sample_interval !== 'number') {
      throw Error('\'sample_interval\' must be a number');
    }
    if (!Number.isSafeInteger(sample_interval)) {
      throw Error('\'sample_interval\' must be an integer');
    }
    if (sample_interval < 1) {
      throw Error('\'sample_interval\' must be greater than 0');
    }
    // save_interval
    if (typeof save_interval === 'undefined') {
      throw Error('\'save_interval\' must be provided as an integer');
    }
    if (typeof save_interval !== 'number') {
      throw Error('\'save_interval\' must be a number');
    }
    if (!Number.isSafeInteger(save_interval)) {
      throw Error('\'save_interval\' must be an integer');
    }
    if (save_interval < 1) {
      throw Error('\'save_interval\' must be greater than 0');
    }
  }

  constructor({save_to, sample_interval = DEFAULT_SAMPLE_INTERVAL, save_interval = DEFAULT_SAVE_INTERVAL}) {
    super();
    this.onSave = this.onSave.bind(this);
    this.onSample = this.onSample.bind(this);
    this.saveTo = path.resolve(process.cwd(), save_to);
    this.sampleInterval = sample_interval;
    this.saveInterval = save_interval;
    this.sampleTimer = setInterval(this.onSample, sample_interval * 1e3);
    this.saveTimer = setInterval(this.onSave, save_interval * 1e3);
    process.on('SIGINT', this.onSave);
  }

  onSave() {
    const startedAt = this.startedAt;
    const endAt = now();
    const durationMilliSec = endAt - startedAt;
    const durationSec = durationMilliSec / 1e3;
    const totalPackets = this.totalInPackets + this.totalOutPackets;
    const totalBytes = this.totalInBytes + this.totalOutBytes;
    const json = {
      sample: {
        from: startedAt,
        to: endAt,
        duration: durationMilliSec
      },
      summary: {
        maxOutSpeed: this.maxOutSpeed,
        maxInSpeed: this.maxInSpeed,
        maxConnections: this.maxConnections,
        totalOutBytes: this.totalOutBytes,
        totalOutPackets: this.totalOutPackets,
        totalInBytes: this.totalInBytes,
        totalInPackets: this.totalInPackets,
        totalBytes: totalBytes,
        totalPackets: totalPackets,
        totalErrors: this.totalErrors
      },
      instant: {
        outSpeed: this.instantOutSpeed,
        inSpeed: this.instantInSpeed,
        totalConnections: this.totalConnections,
        errorRate: totalPackets.length > 0 ? this.totalErrors / totalPackets : 0,
        outBytesPerSecond: this.totalOutBytes / durationSec,
        outPacketsPerSecond: this.totalOutPackets / durationSec,
        inBytesPerSecond: this.totalInBytes / durationSec,
        inPacketsPerSecond: this.totalInPackets / durationSec,
        totalBytesPerSecond: totalBytes / durationSec,
        totalPacketsPerSecond: totalPackets / durationSec
      },
      process: {
        upTime: process.uptime(),
        cpuUsage: process.cpuUsage(),
        memoryUsage: process.memoryUsage()
      }
    };
    fs.writeFileSync(this.saveTo, JSON.stringify(json, null, '  '));
  }

  onSample() {
    this.instantOutSpeed = this.tmpOut / this.sampleInterval;
    this.instantInSpeed = this.tmpIn / this.sampleInterval;

    this.maxOutSpeed = Math.max(this.maxOutSpeed, this.instantOutSpeed);
    this.maxInSpeed = Math.max(this.maxInSpeed, this.instantInSpeed);

    this.tmpOut = 0;
    this.tmpIn = 0;
  }

  onNotified(action) {
    if (action.type === PRESET_FAILED) {
      this.totalErrors += 1;
    }
    if (action.type === CONNECTION_CREATED) {
      this.totalConnections += 1;
      this.maxConnections = Math.max(this.maxConnections, this.totalConnections);
    }
    if (action.type === CONNECTION_CLOSED) {
      this.totalConnections -= 1;
    }
  }

  onDestroy() {
    clearInterval(this.sampleTimer);
    clearInterval(this.saveTimer);
  }

  beforeOut({buffer}) {
    this.totalOutBytes += buffer.length;
    this.totalOutPackets += 1;
    this.tmpOut += buffer.length;
    return buffer;
  }

  beforeIn({buffer}) {
    this.totalInBytes += buffer.length;
    this.totalInPackets += 1;
    this.tmpIn += buffer.length;
    return buffer;
  }

  beforeOutUdp(...args) {
    return this.beforeOut(...args);
  }

  beforeInUdp(...args) {
    return this.beforeIn(...args);
  }

}
