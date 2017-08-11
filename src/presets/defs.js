export const PRESET_INIT = 'preset/init';
export const SOCKET_CONNECT_TO_REMOTE = 'socket/connect/to/remote';
export const PROCESSING_FAILED = 'processing/failed';

export class IPreset {

  /**
   * how to deal with the action, return false/undefined to ignore/continue broadcast
   * @returns {boolean}
   */
  onNotified(/* action */) {
    return false;
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

// actions may be received by built-in presets in onNotified(action):

/**
 * @action PRESET_INIT
 *   {
 *     type: PRESET_INIT,
 *     payload: {
 *       broadcast: (action) => {}
 *     }
 *   }
 */

/**
 * @action SOCKET_CONNECT_TO_REMOTE
 *   {
 *     type: SOCKET_CONNECT_TO_REMOTE,
 *     payload: {
 *       targetAddress: {type, host, port},
 *       onConnected: () => {}
 *     }
 *   }
 */

/**
 * @action PROCESSING_FAILED
 *   {
 *     type: PROCESSING_FAILED,
 *     payload: {
 *       name: 'custom' or null,
 *       message: 'explain',
 *       orgData: <Buffer> or null
 *     }
 *   }
 */
