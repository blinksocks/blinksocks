import os from 'os';
import path from 'path';

// paths
const HOME_DIR = os.homedir();
const BLINKSOCKS_DIR = path.join(HOME_DIR, '.blinksocks');

// log
const LOG_DIR = path.join(BLINKSOCKS_DIR, 'logs');
const LOG_FILE_PATH = path.join(LOG_DIR,
  (typeof process.env.RUN_AS === 'undefined') ? 'blinksocks.log' : {
    'server': 'blinksocks-server.log',
    'client': 'blinksocks-client.log'
  }[process.env.RUN_AS]
);
const LOG_FILE_MAX_SIZE = 2 * 1024 * 1024; // 2MB
const DEFAULT_LOG_LEVEL = 'info';
const DEFAULT_WORKERS = os.cpus().length;

module.exports = {
  HOME_DIR,
  BLINKSOCKS_DIR,
  LOG_DIR,
  LOG_FILE_PATH,
  LOG_FILE_MAX_SIZE,
  DEFAULT_LOG_LEVEL,
  DEFAULT_WORKERS
};
