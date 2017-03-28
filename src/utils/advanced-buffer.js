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
  _buffer = Buffer.alloc(0);

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
   * @param args
   */
  put(chunk, ...args) {
    if (!(chunk instanceof Buffer)) {
      throw Error('chunk must be a Buffer');
    }
    this._buffer = this._digest(Buffer.concat([this._buffer, chunk]), ...args);
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
   * @param args
   * @returns {Buffer}
   */
  _digest(buffer, ...args) {
    const bound = this._getPacketLength(buffer, ...args);

    if (bound === 0 || typeof bound === 'undefined') {
      return buffer; // continue to put
    }

    if (bound === -1) {
      return Buffer.alloc(0); // drop this one
    }

    if (bound instanceof Buffer) {
      return this._digest(bound, ...args); // start from the new point
    }

    if (buffer.length === bound) {
      this.emit('data', Buffer.from(buffer), ...args);
      return Buffer.alloc(0);
    }

    if (buffer.length > bound) {
      this.emit('data', buffer.slice(0, bound), ...args);
      // recursively digest buffer
      return this._digest(buffer.slice(bound), ...args);
    }

    if (buffer.length < bound) {
      return buffer; // continue to put
    }
  }

}
