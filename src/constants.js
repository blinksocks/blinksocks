import { randomBytes } from './utils/crypto';

export const APP_ID = randomBytes(16).toString('hex');
export const PIPE_ENCODE = 1;
export const PIPE_DECODE = -1;
export const MAX_BUFFERED_SIZE = 512 * 1024; // 512KB
