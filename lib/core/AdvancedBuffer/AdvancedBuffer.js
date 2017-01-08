'use strict';Object.defineProperty(exports,'__esModule',{value:true});exports.AdvancedBuffer=undefined;var _extends=Object.assign||function(target){for(var i=1;i<arguments.length;i++){var source=arguments[i];for(var key in source){if(Object.prototype.hasOwnProperty.call(source,key)){target[key]=source[key]}}}return target};var _createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if('value'in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor}}();var _events=require('events');var _events2=_interopRequireDefault(_events);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj}}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError('Cannot call a class as a function')}}function _possibleConstructorReturn(self,call){if(!self){throw new ReferenceError('this hasn\'t been initialised - super() hasn\'t been called')}return call&&(typeof call==='object'||typeof call==='function')?call:self}function _inherits(subClass,superClass){if(typeof superClass!=='function'&&superClass!==null){throw new TypeError('Super expression must either be null or a function, not '+typeof superClass)}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,enumerable:false,writable:true,configurable:true}});if(superClass)Object.setPrototypeOf?Object.setPrototypeOf(subClass,superClass):subClass.__proto__=superClass}/**
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
 */var AdvancedBuffer=exports.AdvancedBuffer=function(_EventEmitter){_inherits(AdvancedBuffer,_EventEmitter);// native Buffer instance to store our data
function AdvancedBuffer(){var options=arguments.length>0&&arguments[0]!==undefined?arguments[0]:{};_classCallCheck(this,AdvancedBuffer);var _this=_possibleConstructorReturn(this,(AdvancedBuffer.__proto__||Object.getPrototypeOf(AdvancedBuffer)).call(this));_this._buffer=Buffer.from([]);_this.options=null;_this.options=_extends({lens:[0,1],getPacketLength:_this.getPacketLength},options);if(!Array.isArray(_this.options.lens)){throw Error('lens should be an Array')}if(_this.options.lens.length!==2){throw Error('lens should only have two elements')}if(_this.options.lens[0]<0){throw Error('lens[0] should be more than zero')}if(_this.options.lens[0]>=_this.options.lens[1]){throw Error('lens[0] should be less than lens[1]')}if(_this.options.lens[1]-_this.options.lens[0]+1>6){throw Error('the bytes range should be less than 6')}if(typeof _this.options.getPacketLength!=='function'){throw Error('getPacketLength should be a function')}return _this}/**
   * how to get packet length from a buffer with lens
   * @param bytes{Buffer}
   * @returns {Buffer}
   */_createClass(AdvancedBuffer,[{key:'getPacketLength',value:function getPacketLength(bytes){return bytes.readUIntBE(0,bytes.length)}/**
   * put incoming chunk to the buffer, then digest them
   * @param chunk{Buffer}
   */},{key:'put',value:function put(chunk){if(!(chunk instanceof Buffer)){throw Error('chunk must be a Buffer')}this._buffer=this.digest(Buffer.concat([this._buffer,chunk]))}/**
   * digest a buffer, emit an event if a complete packet was resolved
   * @param buffer{Buffer}: a buffer to be digested
   * @returns {Buffer}
   */},{key:'digest',value:function digest(buffer){var lens=this.options.lens;if(buffer.length<lens[1]+1){return buffer}var bound=this.options.getPacketLength(buffer.slice(lens[0],lens[1]+1));if(buffer.length===bound){this.emit('data',Buffer.from(buffer));return Buffer.from([])}if(buffer.length>bound){this.emit('data',buffer.slice(0,bound));// recursively digest buffer
return this.digest(buffer.slice(bound))}if(buffer.length<bound){return buffer}}/**
   * get the rest of data in the buffer
   * @returns {Buffer}
   */},{key:'getRest',value:function getRest(){return Buffer.from(this._buffer)}}]);return AdvancedBuffer}(_events2.default);