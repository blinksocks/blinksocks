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

  _nextLength = 0;

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
    const expectLen = this._nextLength || this._getPacketLength(buffer, ...args);

    if (expectLen === 0 || typeof expectLen === 'undefined') {
      return buffer; // continue to put
    }

    if (expectLen === -1) {
      return Buffer.alloc(0); // drop this one
    }

    if (expectLen instanceof Buffer) {
      return this._digest(expectLen, ...args); // start from the new point
    }

    // luckily: <- [chunk]
    if (buffer.length === expectLen) {
      this.emit('data', Buffer.from(buffer), ...args);
      this._nextLength = 0;
      return Buffer.alloc(0);
    }

    // incomplete packet: <- [chu]
    if (buffer.length < expectLen) {
      // prevent redundant calling to getPacketLength()
      this._nextLength = expectLen;

      // continue to put
      return buffer;
    }

    // packet sticking: <- [chunk][chunk][chu...
    if (buffer.length > expectLen) {
      this.emit('data', buffer.slice(0, expectLen), ...args);

      // note that each chunk has probably different length
      this._nextLength = 0;

      // digest buffer recursively
      return this._digest(buffer.slice(expectLen), ...args);
    }
  }

}
