import { randomBytes } from './utils/crypto';

export const APP_ID = randomBytes(16).toString('hex');
export const PIPE_ENCODE = 1;
export const PIPE_DECODE = -1;

export const PRESET_FAILED = 'PRESET_FAILED';
export const CONNECT_TO_REMOTE = 'CONNECT_TO_REMOTE';

// https://url.spec.whatwg.org/#url-miscellaneous
export const PROTOCOL_DEFAULT_PORTS = {
  'ftp:': 21,
  'gopher:': 70,
  'http:': 80,
  'https:': 443,
  'ws:': 80,
  'wss:': 443,
  'h2:': 443,
};
