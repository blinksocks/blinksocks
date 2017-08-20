import winston from 'winston';

const LOG_FILE_MAX_SIZE = 2 * 1024 * 1024; // 2MB

let instance = null;

export const Logger = {

  init({file, level}) {
    instance = new (winston.Logger)({
      transports: [
        new (winston.transports.Console)({
          colorize: true,
          prettyPrint: true
        }),
        new (winston.transports.File)({
          filename: file,
          maxsize: LOG_FILE_MAX_SIZE,
          silent: ['test', 'debug'].includes(process.env.NODE_ENV)
        })
      ]
    });
    instance.level = level;
  },

  getInstance() {
    return instance || winston;
  }

};
