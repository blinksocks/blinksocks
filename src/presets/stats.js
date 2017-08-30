import fs from 'fs';
import {IPreset, PROCESSING_FAILED, CONNECTION_CLOSED, CONNECTION_CREATED} from './defs';

const now = () => (new Date()).getTime();

const DEFAULT_SAMPLE_INTERVAL = 30;
const DEFAULT_SAVE_INTERVAL = 60;

/**
 * @description
 *   Perform statistics among traffic via this preset
 *
 * @params
 *   interval: The sample interval in seconds.
 *
 * @examples
 *   {
 *     "name": "stats",
 *     "params": {
 *       "save_to": "stats.json",
 *       "sample_interval": 1,
 *       "save_interval": 10
 *     }
 *   }
 */
export default class StatsPreset extends IPreset {

  sampleInterval = DEFAULT_SAMPLE_INTERVAL; // seconds

  saveInterval = DEFAULT_SAVE_INTERVAL; // seconds

  static saveTo = '';

  static sampleTimer = null;

  static saveTimer = null;

  static isHookExit = false;

  // statistics

  static startedAt = now();

  static totalOutBytes = 0;

  static totalInBytes = 0;

  static totalOutPackets = 0;

  static totalInPackets = 0;

  static totalErrors = 0;

  static totalConnections = 0;

  // calculated

  static instantOutSpeed = 0;

  static instantInSpeed = 0;

  static maxOutSpeed = 0;

  static maxInSpeed = 0;

  static maxConnections = 0;

  // temporary

  static tmpOut = 0;

  static tmpIn = 0;

  constructor(params) {
    super();
    const props = {
      sample_interval: DEFAULT_SAMPLE_INTERVAL,
      save_interval: DEFAULT_SAVE_INTERVAL,
      ...params
    };
    // save_to
    if (typeof props.save_to !== 'string' || props.save_to.length < 1) {
      throw Error('\'save_to\' must be provided as a non-empty string');
    }
    // sample_interval
    if (typeof props.sample_interval === 'undefined') {
      throw Error('\'sample_interval\' must be provided as an integer');
    }
    if (typeof props.sample_interval !== 'number') {
      throw Error('\'sample_interval\' must be a number');
    }
    if (!Number.isSafeInteger(props.sample_interval)) {
      throw Error('\'sample_interval\' must be an integer');
    }
    if (props.sample_interval < 1) {
      throw Error('\'sample_interval\' must be greater than 0');
    }
    // save_interval
    if (typeof props.save_interval === 'undefined') {
      throw Error('\'save_interval\' must be provided as an integer');
    }
    if (typeof props.save_interval !== 'number') {
      throw Error('\'save_interval\' must be a number');
    }
    if (!Number.isSafeInteger(props.save_interval)) {
      throw Error('\'save_interval\' must be an integer');
    }
    if (props.save_interval < 1) {
      throw Error('\'save_interval\' must be greater than 0');
    }
    StatsPreset.saveTo = props.save_to;
    this.sampleInterval = props.sample_interval;
    this.saveInterval = props.save_interval;
    // timers
    if (StatsPreset.sampleTimer === null) {
      StatsPreset.sampleTimer = setInterval(this.sample.bind(this), props.sample_interval * 1e3);
    }
    if (StatsPreset.saveTimer === null) {
      StatsPreset.saveTimer = setInterval(StatsPreset.save, props.save_interval * 1e3);
    }
    // exit hook
    if (!StatsPreset.isHookExit) {
      process.on('SIGINT', StatsPreset.save);
      StatsPreset.isHookExit = true;
    }
  }

  static save() {
    const startedAt = StatsPreset.startedAt;
    const endAt = now();
    const durationMilliSec = endAt - startedAt;
    const durationSec = durationMilliSec / 1e3;
    const totalPackets = StatsPreset.totalInPackets + StatsPreset.totalOutPackets;
    const totalBytes = StatsPreset.totalInBytes + StatsPreset.totalOutBytes;
    const json = {
      sample: {
        from: startedAt,
        to: endAt,
        duration: durationMilliSec
      },
      summary: {
        maxOutSpeed: StatsPreset.maxOutSpeed,
        maxInSpeed: StatsPreset.maxInSpeed,
        maxConnections: StatsPreset.maxConnections,
        totalOutBytes: StatsPreset.totalOutBytes,
        totalOutPackets: StatsPreset.totalOutPackets,
        totalInBytes: StatsPreset.totalInBytes,
        totalInPackets: StatsPreset.totalInPackets,
        totalBytes: totalBytes,
        totalPackets: totalPackets,
        totalErrors: StatsPreset.totalErrors
      },
      instant: {
        outSpeed: StatsPreset.instantOutSpeed,
        inSpeed: StatsPreset.instantInSpeed,
        totalConnections: StatsPreset.totalConnections,
        errorRate: totalPackets.length > 0 ? StatsPreset.totalErrors / totalPackets : 0,
        outBytesPerSecond: StatsPreset.totalOutBytes / durationSec,
        outPacketsPerSecond: StatsPreset.totalOutPackets / durationSec,
        inBytesPerSecond: StatsPreset.totalInBytes / durationSec,
        inPacketsPerSecond: StatsPreset.totalInPackets / durationSec,
        totalBytesPerSecond: totalBytes / durationSec,
        totalPacketsPerSecond: totalPackets / durationSec
      },
      process: {
        upTime: process.uptime(),
        cpuUsage: process.cpuUsage(),
        memoryUsage: process.memoryUsage()
      }
    };
    fs.writeFileSync(StatsPreset.saveTo, JSON.stringify(json, null, '  '));
  }

  sample() {
    StatsPreset.instantOutSpeed = StatsPreset.tmpOut / this.sampleInterval;
    StatsPreset.instantInSpeed = StatsPreset.tmpIn / this.sampleInterval;

    StatsPreset.maxOutSpeed = Math.max(StatsPreset.maxOutSpeed, StatsPreset.instantOutSpeed);
    StatsPreset.maxInSpeed = Math.max(StatsPreset.maxInSpeed, StatsPreset.instantInSpeed);

    StatsPreset.tmpOut = 0;
    StatsPreset.tmpIn = 0;
  }

  onNotified(action) {
    if (action.type === PROCESSING_FAILED) {
      StatsPreset.totalErrors += 1;
    }
    if (action.type === CONNECTION_CREATED) {
      StatsPreset.totalConnections += 1;
      StatsPreset.maxConnections = Math.max(StatsPreset.maxConnections, StatsPreset.totalConnections);
    }
    if (action.type === CONNECTION_CLOSED) {
      StatsPreset.totalConnections -= 1;
    }
  }

  onDestroy() {
    clearInterval(StatsPreset.sampleTimer);
    clearInterval(StatsPreset.saveTimer);
  }

  beforeOut({buffer}) {
    StatsPreset.totalOutBytes += buffer.length;
    StatsPreset.totalOutPackets += 1;
    StatsPreset.tmpOut += buffer.length;
    return buffer;
  }

  beforeIn({buffer}) {
    StatsPreset.totalInBytes += buffer.length;
    StatsPreset.totalInPackets += 1;
    StatsPreset.tmpIn += buffer.length;
    return buffer;
  }

}
