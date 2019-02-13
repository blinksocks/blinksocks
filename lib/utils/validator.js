"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isValidHostname = isValidHostname;
exports.isValidPort = isValidPort;

function isValidHostname(hostname) {
  if (typeof hostname !== 'string') {
    return false;
  }

  if (hostname.length < 1 || hostname.length > 253) {
    return false;
  }

  if (/^([a-z\d](-*[a-z\d])*)(\.([a-z\d](-*[a-z\d])*))*$/i.test(hostname) === false) {
    return false;
  }

  if (/^[^.]{1,63}(\.[^.]{1,63})*$/.test(hostname) === false) {
    return false;
  }

  return true;
}

function isValidPort(port) {
  if (!Number.isInteger(port)) {
    return false;
  }

  return !(port <= 0 || port >= 65535);
}