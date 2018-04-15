// - pushed by relay

/**
 *  {
 *    type: CONNECTION_CLOSED
 *    payload: {
 *      host: '127.0.0.1',
 *      port: 12345
 *    }
 *  }
 */
export const CONNECTION_CLOSED = '@action:connection_closed';

/**
 *  {
 *    type: CONNECTION_WILL_CLOSE
 *    payload: {
 *      host: '127.0.0.1',
 *      port: 12345
 *    }
 *  }
 */
export const CONNECTION_WILL_CLOSE = '@action:connection_will_close';

// - emitted by presets

/**
 *  {
 *    type: CONNECT_TO_REMOTE,
 *    payload: {
 *      host: 'bing.com',
 *      port: 443,
 *      onConnected: () => {},
 *      keepAlive: false
 *    }
 *  }
 */
export const CONNECT_TO_REMOTE = '@action:connect_to_remote';

/**
 *  {
 *    type: CONNECTED_TO_REMOTE,
 *    payload: {
 *      host: 'bing.com',
 *      port: 443
 *    }
 *  }
 */
export const CONNECTED_TO_REMOTE = '@action:connected_to_remote';

/**
 *  {
 *    type: PRESET_FAILED,
 *    payload: {
 *      name: 'custom' or null,
 *      message: 'explain',
 *      orgData: <Buffer> or null
 *    }
 *  }
 */
export const PRESET_FAILED = '@action:preset_failed';

export const MUX_NEW_CONN = '@action:mux_new_conn';
export const MUX_DATA_FRAME = '@action:mux_data_frame';
export const MUX_CLOSE_CONN = '@action:mux_close_conn';
