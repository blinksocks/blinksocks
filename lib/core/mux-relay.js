'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MuxRelay = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _relay = require('./relay');

var _utils = require('../utils');

var _transports = require('../transports');

var _actions = require('../presets/actions');

class MuxRelay extends _relay.Relay {
  constructor(...args) {
    var _temp;

    return _temp = super(...args), this._subRelays = new Map(), _temp;
  }

  getBounds(transport) {
    const mapping = {
      'tcp': [_transports.TcpInbound, _transports.TcpOutbound],
      'tls': [_transports.TlsInbound, _transports.TlsOutbound],
      'ws': [_transports.WsInbound, _transports.WsOutbound]
    };

    var _ref = this._config.is_client ? [_transports.MuxInbound, mapping[transport][1]] : [mapping[transport][0], _transports.MuxOutbound],
        _ref2 = _slicedToArray(_ref, 2);

    const Inbound = _ref2[0],
          Outbound = _ref2[1];

    return { Inbound, Outbound };
  }

  onBroadcast(action) {
    switch (action.type) {
      case _actions.MUX_NEW_CONN:
        return this.onNewSubConn(action.payload);
      case _actions.MUX_DATA_FRAME:
        return this.onDataFrame(action.payload);
      case _actions.MUX_CLOSE_CONN:
        return this.onSubConnCloseByProtocol(action.payload);
    }
    this._inbound && this._inbound.onBroadcast(action);
    this._outbound && this._outbound.onBroadcast(action);
  }

  preparePresets(presets) {
    const first = presets[0];

    if (!first || first.name !== 'mux') {
      presets = [{ 'name': 'mux' }].concat(presets);
    }
    return presets;
  }

  destroy() {
    super.destroy();
    const subRelays = this.getSubRelays();
    if (subRelays) {
      _utils.logger.info(`[mux-${this.id}] connection destroyed, cleanup ${subRelays.size} sub connections`);
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = subRelays.values()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          const relay = _step.value;

          relay.destroy();
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      subRelays.clear();
      this._subRelays = null;
    }
  }

  onNewSubConn({ cid, host, port }) {
    const muxRelay = this._getRandomMuxRelay();
    if (muxRelay) {
      const relay = new _relay.Relay({
        config: this._config,
        transport: 'mux',
        context: {
          socket: this._ctx.socket,
          remoteInfo: this._ctx.remoteInfo,
          cid,
          muxRelay }
      });
      const proxyRequest = {
        host: host,
        port: port,
        onConnected: () => {
          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {
            for (var _iterator2 = relay.__pendingFrames[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              const frame = _step2.value;

              relay.decode(frame);
            }
          } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion2 && _iterator2.return) {
                _iterator2.return();
              }
            } finally {
              if (_didIteratorError2) {
                throw _iteratorError2;
              }
            }
          }

          relay.__pendingFrames = null;
        }
      };

      relay.__pendingFrames = [];
      relay.init({ proxyRequest });

      relay.id = cid;

      muxRelay.addSubRelay(relay);

      _utils.logger.info(`[mux-${muxRelay.id}] create sub connection(cid=${relay.id}), total: ${muxRelay.getSubRelays().size}`);
    } else {
      _utils.logger.warn(`[mux-${muxRelay.id}] cannot create new sub connection due to no mux connection are available`);
    }
  }

  onDataFrame({ cid, data }) {
    const relay = this._subRelays.get(cid);
    if (!relay) {
      _utils.logger.error(`[mux-${this.id}] fail to dispatch data frame(size=${data.length}), no such sub connection(cid=${cid})`);
      return;
    }
    if (this._config.is_client || relay.isOutboundReady()) {
      relay.decode(data);
    } else {
      relay.__pendingFrames = [];
      relay.__pendingFrames.push(data);
    }
  }

  onSubConnCloseByProtocol({ cid }) {
    const relay = this._subRelays.get(cid);
    if (relay) {
      this._removeSubRelay(cid);
      relay.destroy();
      _utils.logger.debug(`[mux-${this.id}] sub connection(cid=${cid}) closed by protocol`);
    }
  }

  onSubConnCloseBySelf({ cid }) {
    const relay = this._getSubRelay(cid);
    if (relay) {
      this.destroySubRelay(cid);
      _utils.logger.debug(`[mux-${this.id}] sub connection(cid=${cid}) closed by self, remains: ${this.getSubRelays().size}`);
    }
  }

  addSubRelay(relay) {
    relay.on('close', this.onSubConnCloseBySelf.bind(this, { cid: relay.id }));
    this._subRelays.set(relay.id, relay);
  }

  getSubRelays() {
    return this._subRelays;
  }

  destroySubRelay(cid) {
    const relay = this._getSubRelay(cid);
    if (relay) {
      this.encode(Buffer.alloc(0), { cid, isClosing: true });
      this._removeSubRelay(cid);
      relay.destroy();
    }
  }

  _removeSubRelay(cid) {
    this._subRelays.delete(cid);
  }

  _getSubRelay(cid) {
    if (this._subRelays) {
      return this._subRelays.get(cid);
    }
  }

  _getRandomMuxRelay() {
    var _ctx = this._ctx;
    const muxRelays = _ctx.muxRelays,
          remoteInfo = _ctx.remoteInfo;

    const relays = [...muxRelays.values()].filter(relay => relay._ctx && relay._ctx.remoteInfo.host === remoteInfo.host && relay._ctx.remoteInfo.port === remoteInfo.port);
    return relays[(0, _utils.getRandomInt)(0, relays.length - 1)];
  }

}
exports.MuxRelay = MuxRelay;