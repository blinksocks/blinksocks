import EventEmitter from 'events';

/**
 * Provide a mechanism for dealing with packet sticking and incomplete packet
 * when receiving data from a socket in a long connection over TCP.
 *
 * @glossary
 *         +---lens---+
 *         |          |
 *   [0xff, 0x00, 0x04, 0xff, ...] = packet
 *   |                      |
 *   +--------chunk---------+
 *
 * @options
 *   [lens=[start, end] (Array): which bytes represent a length of a packet
 *   [getPacketLength=default] (Function): how to interpret the bytes to a number
 *
 * @methods
 *   .on('data', callback)
 *   .put(chunk);
 *
 * @examples
 *   const buffer = new AdvancedBuffer({
 *     lens: [0, 1], // default
 *     getPacketLength: (bytes) => bytes.readUIntBE(0, bytes.length) // default
 *   });
 *
 *   buffer.on('data', (all) => {
 *     // all = [0, 2]
 *   });
 *
 *   buffer.put(new Buffer[0, 2]);
 *   buffer.put(new Buffer[0])
 *   buffer.put...
 */
export class AdvancedBuffer extends EventEmitter {

  // native Buffer instance to store our data
  _buffer = Buffer.from([]);

  options = null;

  constructor(options = {}) {
    super();
    this.options = {
      lens: [0, 1],
      getPacketLength: this.getPacketLength,
      ...options
    };

    if (!Array.isArray(this.options.lens)) {
      throw Error('lens should be an Array');
    }

    if (this.options.lens.length !== 2) {
      throw Error('lens should only have two elements');
    }

    if (this.options.lens[0] < 0) {
      throw Error('lens[0] should be more than zero');
    }

    if (this.options.lens[0] >= this.options.lens[1]) {
      throw Error('lens[0] should be less than lens[1]');
    }

    if (this.options.lens[1] - this.options.lens[0] + 1 > 6) {
      throw Error('the bytes range should be less than 6');
    }

    if (typeof this.options.getPacketLength !== 'function') {
      throw Error('getPacketLength should be a function');
    }
  }

  /**
   * how to get packet length from a buffer with lens
   * @param bytes{Buffer}
   * @returns {Buffer}
   */
  getPacketLength(bytes) {
    return bytes.readUIntBE(0, bytes.length);
  }

  /**
   * put incoming chunk to the buffer, then digest them
   * @param chunk{Buffer}
   */
  put(chunk) {
    if (!(chunk instanceof Buffer)) {
      throw Error('chunk must be a Buffer');
    }
    this._buffer = this.digest(Buffer.concat([this._buffer, chunk]));
  }

  /**
   * digest a buffer, emit an event if a complete packet was resolved
   * @param buffer{Buffer}: a buffer to be digested
   * @returns {Buffer}
   */
  digest(buffer) {
    const lens = this.options.lens;

    if (buffer.length < lens[1] + 1) {
      return buffer;
    }

    const bound = this.options.getPacketLength(buffer.slice(lens[0], lens[1] + 1));

    if (buffer.length === bound) {
      this.emit('data', Buffer.from(buffer));
      return Buffer.from([]);
    }

    if (buffer.length > bound) {
      this.emit('data', buffer.slice(0, bound));
      // recursively digest buffer
      return this.digest(buffer.slice(bound));
    }

    if (buffer.length < bound) {
      return buffer;
    }
  }

  /**
   * get the rest of data in the buffer
   * @returns {Buffer}
   */
  getRest() {
    return Buffer.from(this._buffer);
  }

}
