// actions may be received by built-in presets in onNotified(action):

/**
 *  {
 *    type: CONNECTION_CREATED,
 *    payload: {
 *      host: '127.0.0.1',
 *      port: 12345
 *    }
 *  }
 */
export const CONNECTION_CREATED = 'connection/created';

/**
 *  {
 *    type: CONNECTION_CLOSED
 *    payload: {
 *      host: '127.0.0.1',
 *      port: 12345
 *    }
 *  }
 */
export const CONNECTION_CLOSED = 'connection/closed';

/**
 *  {
 *    type: PRESET_INIT,
 *    payload: {
 *      broadcast: (action) => {}
 *    }
 *  }
 */
export const PRESET_INIT = 'preset/init';

/**
 *  {
 *    type: SOCKET_CONNECT_TO_REMOTE,
 *    payload: {
 *      host: 'bing.com',
 *      port: 443,
 *      onConnected: () => {}
 *    }
 *  }
 */
export const SOCKET_CONNECT_TO_REMOTE = 'socket/connect/to/remote';

/**
 *  {
 *    type: PROCESSING_FAILED,
 *    payload: {
 *      name: 'custom' or null,
 *      message: 'explain',
 *      orgData: <Buffer> or null
 *    }
 *  }
 */
export const PROCESSING_FAILED = 'processing/failed';

export class IPreset {

  /**
   * how to deal with the action, return false/undefined to ignore/continue broadcast
   * @returns {boolean}
   */
  onNotified(/* action */) {
    return false;
  }

  /**
   * you can do something when preset destroyed
   */
  onDestroy() {

  }

  // hooks

  beforeOut({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  beforeIn({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  // the following interfaces must be implemented

  clientOut({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  serverIn({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  serverOut({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

  clientIn({buffer/* , next, broadcast, direct, fail */}) {
    return buffer;
  }

}
