import { randomBytes } from './utils/crypto';

export const APP_ID = randomBytes(16).toString('hex');
export const PIPE_ENCODE = 1;
export const PIPE_DECODE = -1;
export const MAX_BUFFERED_SIZE = 512 * 1024; // 512KB

export const PRESET_FAILED = 'PRESET_FAILED';
export const CONNECT_TO_REMOTE = 'CONNECT_TO_REMOTE';
export const CONNECTED_TO_REMOTE = 'CONNECTED_TO_REMOTE';
export const MUX_NEW_CONN = 'MUX_NEW_CONN';
export const MUX_DATA_FRAME = 'MUX_DATA_FRAME';
export const MUX_CLOSE_CONN = 'MUX_CLOSE_CONN';

// https://url.spec.whatwg.org/#url-miscellaneous
export const PROTOCOL_DEFAULT_PORTS = {
  'ftp:': 21,
  'gopher:': 70,
  'http:': 80,
  'https:': 443,
  'ws:': 80,
  'wss:': 443,
};
