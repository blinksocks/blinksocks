"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getCurrentTimestampInt = getCurrentTimestampInt;

function getCurrentTimestampInt() {
  return Math.floor(Date.now() / 1e3);
}