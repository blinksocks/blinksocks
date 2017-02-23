import EventEmitter from 'events';

/**
 * Provide a mechanism for dealing with packet sticking and incomplete packet
 * when receiving data from a socket in a long connection over TCP.
 *
 * @glossary
 *
 *   [0xff, 0x00, 0x04, 0xff, ...] = packet
 *   |                      |
 *   +--------chunk---------+
 *
 * @options
 *   getPacketLength (Function): how to interpret the bytes to a number
 *
 * @methods
 *   .on('data', callback)
 *   .put(chunk);
 *
 * @examples
 *   const buffer = new AdvancedBuffer({
 *     getPacketLength: (bytes) => 0 // default
 *   });
 *
 *   buffer.on('data', (all) => {
 *     // all = [0, 2]
 *   });
 *
 *   buffer.put(Buffer.from([0, 2]));
 *   buffer.put(Buffer.from([0]))
 *   buffer.put...
 */
export class AdvancedBuffer extends EventEmitter {

  // native Buffer instance to store our data
  _buffer = Buffer.from([]);

  _getPacketLength = null;

  constructor(options = {}) {
    super();
    if (typeof options.getPacketLength !== 'function') {
      throw Error('options.getPacketLength should be a function');
    }
    this._getPacketLength = options.getPacketLength;
  }

  /**
   * put incoming chunk to the buffer, then digest them
   * @param chunk{Buffer}
   */
  put(chunk) {
    if (!(chunk instanceof Buffer)) {
      throw Error('chunk must be a Buffer');
    }
    this._buffer = this._digest(Buffer.concat([this._buffer, chunk]));
  }

  /**
   * get the rest of data in the buffer
   * @returns {Buffer}
   */
  final() {
    return this._buffer;
  }

  /**
   * digest a buffer, emit an event if a complete packet was resolved
   * @param buffer{Buffer}: a buffer to be digested
   * @returns {Buffer}
   */
  _digest(buffer) {
    const bound = this._getPacketLength(buffer);

    if (typeof bound !== 'number') {
      throw Error('getPacketLength must return a number');
    }

    if (bound <= 0) {
      return buffer;
    }

    if (buffer.length === bound) {
      this.emit('data', Buffer.from(buffer));
      return Buffer.from([]);
    }

    if (buffer.length > bound) {
      this.emit('data', buffer.slice(0, bound));
      // recursively digest buffer
      return this._digest(buffer.slice(bound));
    }

    if (buffer.length < bound) {
      return buffer;
    }
  }

}
