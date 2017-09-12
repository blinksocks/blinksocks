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
