import child_process from 'child_process';
import util from 'util';

const exec = util.promisify(child_process.exec);

export default async function curl({ proxyMethod = 'socks5', proxyHost, proxyPort, targetHost, targetPort }) {
  const proxy = {
    'http': '-x',
    'http_connect': '-p',
    'socks': '--socks5',
    'socks4': '--socks4',
    'socks4a': '--socks4a',
    'socks5': '--socks5-hostname',
  }[proxyMethod];

  if (typeof proxy === 'undefined') {
    throw Error(`unsupported proxy method: ${proxyMethod}`);
  }

  try {
    const options = { encoding: 'utf-8', timeout: 5e3 };
    const { stdout } = await exec(`curl -L ${proxy} ${proxyHost}:${proxyPort} ${targetHost}:${targetPort}`, options);
    return stdout;
  } catch (err) {
    // console.log(err);
    return '';
  }
}
