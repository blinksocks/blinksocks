"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.kebabCase = kebabCase;
exports.dumpHex = dumpHex;

function kebabCase(str) {
  const out = [];

  for (let i = 0; i < str.length; ++i) {
    const ch = str[i];

    if (ch >= 'A' && ch <= 'Z') {
      if (i > 0) {
        out.push('-');
      }

      out.push(ch.toLowerCase());
    } else {
      out.push(ch);
    }
  }

  return out.join('');
}

function dumpHex(buffer, maxSize = 60) {
  let str = buffer.slice(0, maxSize).toString('hex');

  if (buffer.length > maxSize) {
    str += '...';
  }

  return str;
}