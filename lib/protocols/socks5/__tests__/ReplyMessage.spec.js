'use strict';var _ReplyMessage=require('../ReplyMessage');var _common=require('../../common');// describe('ReplyMessage#parse', function () {
//
//   it('should return null if buffer.length < 9', function () {
//     expect(ReplyMessage.parse([])).toBe(null);
//   });
//
//   it('should return null if VER is not SOCKS_VERSION_V5', function () {
//     expect(ReplyMessage.parse([0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(null);
//   });
//
//   it('should return null if REP is invalid', function () {
//     expect(ReplyMessage.parse([
//       SOCKS_VERSION_V5,
//       0x04, 0, 0, 0, 0, 0, 0, 0
//     ])).toBe(null);
//   });
//
//   it('should return null if RSV is not 0x00', function () {
//     expect(ReplyMessage.parse([
//       SOCKS_VERSION_V5,
//       0x03, 0x01, 0, 0, 0, 0, 0, 0
//     ])).toBe(null);
//   });
//
//   it('should return null if ATYP is invalid', function () {
//     expect(ReplyMessage.parse([
//       SOCKS_VERSION_V5,
//       0x03, 0x00, 0x02, 0, 0, 0, 0, 0
//     ])).toBe(null);
//   });
//
//   it('should return an instance', function () {
//     expect(ReplyMessage.parse([
//       SOCKS_VERSION_V5,
//       0x03, 0x00, 0x01, 0, 0, 0, 0, 0
//     ])).not.toBe(null);
//   });
//
// });
describe('ReplyMessage#toBuffer',function(){it('should return the expected buffer',function(){var message=new _ReplyMessage.ReplyMessage;var buffer=Buffer.from([_common.SOCKS_VERSION_V5,_common.REPLY_UNASSIGNED,0,1,0,0,0,0,0,0]);expect(message.toBuffer().equals(buffer)).toBe(true)})});