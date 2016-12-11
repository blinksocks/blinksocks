'use strict';Object.defineProperty(exports,'__esModule',{value:true});exports.Relay=undefined;var _slicedToArray=function(){function sliceIterator(arr,i){var _arr=[];var _n=true;var _d=false;var _e=undefined;try{for(var _i=arr[Symbol.iterator](),_s;!(_n=(_s=_i.next()).done);_n=true){_arr.push(_s.value);if(i&&_arr.length===i)break}}catch(err){_d=true;_e=err}finally{try{if(!_n&&_i['return'])_i['return']()}finally{if(_d)throw _e}}return _arr}return function(arr,i){if(Array.isArray(arr)){return arr}else if(Symbol.iterator in Object(arr)){return sliceIterator(arr,i)}else{throw new TypeError('Invalid attempt to destructure non-iterable instance')}}}();var _createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if('value'in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor}}();var _net=require('net');var _net2=_interopRequireDefault(_net);var _log4js=require('log4js');var _log4js2=_interopRequireDefault(_log4js);var _Config=require('../Config');var _Connection=require('../Connection');var _Crypto=require('../Crypto');var _Encapsulator=require('../Encapsulator');function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj}}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError('Cannot call a class as a function')}}var Logger=_log4js2.default.getLogger('Relay');/**
 * return 6 length hash string of a buffer, for debugging
 * @param buffer
 * @returns {string}
 */function hash(buffer){return _Crypto.Crypto.hash(buffer).slice(0,6)}/**   <- backward                forward ->
 *  +----------------------------------------+
 *  | this._lsocket |  Relay  | this._socket |
 *  +----------------------------------------+
 */var Relay=exports.Relay=function(){// backward net.Socket
function Relay(options){_classCallCheck(this,Relay);this._id=null;this._lsocket=null;this._socket=null;this._cipher=null;this._decipher=null;this._isConnected=false;Logger.setLevel(_Config.Config.log_level);this._id=options.id;this._lsocket=options.socket}// private
// forward net.Socket
_createClass(Relay,[{key:'_connect',value:function _connect(host,port,callback){var _this=this;this._socket=_net2.default.connect({host:host,port:port},function(){Logger.info('['+_this._id+'] ==> '+host+':'+port);_this._isConnected=true;if(typeof callback!=='undefined'){callback(_this._socket)}});this._socket.on('error',function(err){return _this.onError({host:host,port:port},err)});this._socket.on('data',function(buffer){return _this.onReceiving(buffer)});this._cipher=_Crypto.Crypto.createCipher(function(buffer){return _this.onReceived(buffer)});this._decipher=_Crypto.Crypto.createDecipher(function(buffer){return _this.onReceived(buffer)})}},{key:'connect',value:function connect(conn,callback){var _conn$getEndPoint=conn.getEndPoint(),_conn$getEndPoint2=_slicedToArray(_conn$getEndPoint,2),host=_conn$getEndPoint2[0],port=_conn$getEndPoint2[1];// TODO: cache DNS result for domain host to speed up connecting
this._connect(host,port,callback)}},{key:'onError',value:function onError(_ref,err){var host=_ref.host,port=_ref.port;switch(err.code){case'ECONNREFUSED':Logger.warn('['+this._id+'] =x=> '+host+':'+port);break;case'ECONNRESET':Logger.warn('['+this._id+'] '+err.message);break;case'ETIMEDOUT':Logger.warn('['+this._id+'] '+err.message);break;case'EAI_AGAIN':Logger.warn('['+this._id+'] '+err.message);break;case'EPIPE':Logger.warn('['+this._id+'] '+err.message);return;default:Logger.error(err);break;}if(!this._socket.destroyed){this._socket.end()}if(!this._lsocket.destroyed){this._lsocket.end()}}},{key:'onReceiving',value:function onReceiving(buffer){if(_Config.Config.isServer){this._cipher.write(buffer)}else{this._decipher.write(buffer)}}/**
   * backward data via this._lsocket.write()
   * @param buffer
   */},{key:'onReceived',value:function onReceived(buffer){if(_Config.Config.isServer){this.backwardToClient(buffer)}else{this.backwardToApplication(buffer)}}/**
   * backward data to out client
   * @param encrypted
   */},{key:'backwardToClient',value:function backwardToClient(encrypted){// NOTE:
//   It is not necessary encapsulate a header when backward data to client,
//   because client only need the payload.
if(Logger.isInfoEnabled()){var logs=['['+this._id+']',encrypted.length+' bytes(encrypted,'+hash(encrypted)+')'// `${payload.length} bytes(origin,${hash(payload)})`
];Logger.info(logs.join(' <-- '))}this._lsocket.write(encrypted)}/**
   * backward data to applications
   * @param payload
   */},{key:'backwardToApplication',value:function backwardToApplication(payload){if(this._lsocket.destroyed){if(Logger.isWarnEnabled()){var logs=['['+this._id+'] <-x- ',payload.length+' bytes(decrypted,'+hash(payload)+')'];Logger.warn(logs.join(''))}}else{if(Logger.isInfoEnabled()){var _logs=['['+this._id+']',payload.length+' bytes(decrypted,'+hash(payload)+')'];Logger.info(_logs.join(' <-- '))}this._lsocket.write(payload)}}/**
   * forward data to our server
   * @param encrypted
   */},{key:'forwardToServer',value:function forwardToServer(encrypted){var _this2=this;var _send=function _send(data){if(Logger.isInfoEnabled()){var logs=['['+_this2._id+']',// `${buffer.length} bytes(origin,${hash(buffer)})`,
data.length+' bytes (+header,encrypted,'+hash(data)+')'];Logger.info(logs.join(' --> '))}_this2._socket.write(data)};// connect to our server if not connected yet
if(!this._isConnected){// TODO: cache DNS result for domain host to speed up connecting
this._connect(_Config.Config.server_host,_Config.Config.server_port,function(){_send(encrypted)});return}_send(encrypted)}/**
   * forward data to real server
   * @param decrypted
   */},{key:'forwardToDst',value:function forwardToDst(decrypted){var _this3=this;var frame=_Encapsulator.Encapsulator.unpack(decrypted);if(frame===null){if(Logger.isWarnEnabled()){Logger.warn('['+this._id+'] -x-> dropped unidentified packet '+decrypted.length+' bytes')}return}var payload=frame.PAYLOAD;var _send=function _send(data){if(_this3._socket.destroyed){if(Logger.isWarnEnabled()){var logs=['['+_this3._id+'] -x-> ',decrypted.length+' bytes(decrypted,'+hash(decrypted)+') -x-> ',data.length+' bytes(-header,'+hash(data)+')'];Logger.warn(logs.join(''))}_this3._lsocket.end()}else{if(Logger.isInfoEnabled()){var _logs2=['['+_this3._id+']',decrypted.length+' bytes(decrypted,'+hash(decrypted)+')',data.length+' bytes(-header,'+hash(data)+')'];Logger.info(_logs2.join(' --> '))}_this3._socket.write(data)}};// connect to real server if not connected yet
if(!this._isConnected){var conn=new _Connection.Connection({ATYP:frame.ATYP,DSTADDR:frame.DSTADDR,DSTPORT:frame.DSTPORT});this.connect(conn,function(){// send payload of frame
_send(payload)});return}_send(payload)}/**
   * send FIN to the other end
   */},{key:'close',value:function close(){if(this._socket!==null&&!this._socket.destroyed){this._socket.end()}}}]);return Relay}();