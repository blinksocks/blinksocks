/**
 * converts str to kebab case
 */
export function kebabCase(str) {
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

/**
 * dump a slice of buffer into hex string
 * @param buffer
 * @param maxSize
 * @returns {String}
 */
export function dumpHex(buffer, maxSize = 60) {
  let str = buffer.slice(0, maxSize).toString('hex');
  if (buffer.length > maxSize) {
    str += '...';
  }
  return str;
}
