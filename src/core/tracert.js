const dgram = require('dgram');

exports.TRACERT_INBOUND_IN = 100;
exports.TRACERT_INBOUND_OUT = 101;
exports.TRACERT_INBOUND_CONNECTIONS = 102;
exports.TRACERT_INBOUND_ERROR = 103;

exports.TRACERT_OUTBOUND_IN = 200;
exports.TRACERT_OUTBOUND_OUT = 201;
exports.TRACERT_OUTBOUND_CONNECTIONS = 202;
exports.TRACERT_OUTBOUND_ERROR = 203;

exports.TRACERT_PRESET_FAILED = 300;
exports.TRACERT_PRESET_CALLBACK_ERROR = 301;

const Tracert = {

  _pool: [/* [timestamp, key, value], ... */],

  _settings: {
    enabled: true,
    logger: true,
    reportHost: 'localhost',
    reportPort: 41234,
    maxPoolSize: 50,
    flushInterval: 5e3,
  },

  _timer: null,

  _socket: dgram.createSocket('udp4'), // UDP reporter

  _init() {
    process.on('exit', () => this.flush());
  },

  _log(message) {
    if (this._settings.logger) {
      console.log(message);
    }
  },

  configure(opts = {}) {
    Object.assign(this._settings, opts);
  },

  put(key, value) {
    const { enabled, maxPoolSize, flushInterval } = this._settings;
    if (!enabled) {
      clearInterval(this._timer);
      this._timer = null;
      return false;
    }
    if (!this._timer) {
      this.flush = this.flush.bind(this);
      this._timer = setInterval(this.flush, flushInterval);
    }
    this._pool.push([Date.now() + '', key + '', value]);
    if (this._pool.length >= maxPoolSize) {
      this.flush();
    }
    return true;
  },

  flush() {
    if (this._pool.length < 1) {
      return;
    }
    const { reportHost, reportPort } = this._settings;
    for (const record of this._pool) {
      if (typeof record[2] === 'object') {
        record[2] = JSON.stringify(record[2]);
      }
      this._socket.send(record.join('^'), reportPort, reportHost);
    }
    this._log(`[tracert] uploaded records, total: ${this._pool.length}`);
    this._pool = [];
  },

};

Tracert._init();

exports.Tracert = Tracert;
