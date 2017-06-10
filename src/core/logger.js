import winston from 'winston';
import {LOG_FILE_PATH, LOG_FILE_MAX_SIZE} from './constants';

const instance = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: true,
      prettyPrint: true
    }),
    new (winston.transports.File)({
      filename: LOG_FILE_PATH,
      maxsize: LOG_FILE_MAX_SIZE,
      silent: ['test', 'debug'].includes(process.env.NODE_ENV)
    })
  ]
});

export const logger = instance;
export default instance;
