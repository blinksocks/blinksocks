import child_process from 'child_process';
import util from 'util';

const exec = util.promisify(child_process.exec);

export default async function curl(args) {
  const { proxyMethod = 'socks5', proxyHost, proxyPort, targetHost, targetPort } = args;
  const { username, password } = args;
  try {
    let command = ['curl'];
    if (username && password) {
      command.push(`-U ${username}:${password}`);
    }
    switch (proxyMethod) {
      case 'http':
        command.push(`-x http://${proxyHost}:${proxyPort}`);
        break;
      case 'http_connect':
        command.push(`-p -x http://${proxyHost}:${proxyPort}`);
        break;
      case 'https':
        command.push(`--proxy-insecure -x https://${proxyHost}:${proxyPort}`);
        break;
      default: {
        const proxy = {
          'socks': '--socks5',
          'socks4': '--socks4',
          'socks4a': '--socks4a',
          'socks5': '--socks5-hostname',
        }[proxyMethod];
        if (proxy) {
          command.push(`${proxy} ${proxyHost}:${proxyPort}`);
        }
        break;
      }
    }
    command.push(`${targetHost}:${targetPort}`);
    command = command.join(' ');
    const { stdout, stderr } = await exec(command, { encoding: 'utf-8', timeout: 5e3 });
    if (stderr) {
      console.log(command);
      console.log(stderr);
    }
    return stdout;
  } catch (err) {
    console.log(err);
    return '';
  }
}
