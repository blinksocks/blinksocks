'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
const CONNECTION_CLOSED = exports.CONNECTION_CLOSED = '@action:connection_closed';

const CONNECTION_WILL_CLOSE = exports.CONNECTION_WILL_CLOSE = '@action:connection_will_close';

const CONNECT_TO_REMOTE = exports.CONNECT_TO_REMOTE = '@action:connect_to_remote';

const CONNECTED_TO_REMOTE = exports.CONNECTED_TO_REMOTE = '@action:connected_to_remote';

const PRESET_FAILED = exports.PRESET_FAILED = '@action:preset_failed';

const MUX_NEW_CONN = exports.MUX_NEW_CONN = '@action:mux_new_conn';
const MUX_DATA_FRAME = exports.MUX_DATA_FRAME = '@action:mux_data_frame';
const MUX_CLOSE_CONN = exports.MUX_CLOSE_CONN = '@action:mux_close_conn';