import child_process from 'child_process';
import util from 'util';

const exec = util.promisify(child_process.exec);

export default async function curl(args) {
  const { proxyMethod = 'socks5', proxyHost, proxyPort, targetHost, targetPort } = args;
  const { username, password } = args;
  const proxy = {
    'http': '-x',
    'http_connect': '-px',
    'socks': '--socks5',
    'socks4': '--socks4',
    'socks4a': '--socks4a',
    'socks5': '--socks5-hostname',
  }[proxyMethod];

  try {
    let command = `curl `;
    if (username && password) {
      command += `-U ${username}:${password} `;
    }
    if (proxy) {
      command += `-L ${proxy} ${proxyHost}:${proxyPort} `;
    }
    if (proxyMethod === 'https') {
      command += `--proxy-insecure -Lx https://${proxyHost}:${proxyPort} `;
    }
    command += `${targetHost}:${targetPort} `;
    // console.log(command);
    const { stdout } = await exec(command, { encoding: 'utf-8', timeout: 5e3 });
    return stdout;
  } catch (err) {
    // console.log(err);
    return '';
  }
}
