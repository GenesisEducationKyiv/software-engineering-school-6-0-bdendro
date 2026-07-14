import pino from 'pino';
import { LoggerConfig, AppLogger, LogLevel, LogObj } from './interfaces/logger.interface';

export class PinoLogger implements AppLogger {
  private readonly pinoLogger: pino.Logger;

  constructor(config: LoggerConfig) {
    this.pinoLogger = pino({
      name: config.appName,
      timestamp: pino.stdTimeFunctions.isoTime,
      level: config.level,

      transport: config.pretty
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
              ignore: 'pid,hostname',
              singleLine: true,
            },
          }
        : undefined,
    });
  }

  debug(message: string): void;
  debug(obj: LogObj): void;
  debug(obj: LogObj, message: string): void;
  debug(objOrMessage: LogObj | string, message?: string): void {
    this.write('debug', objOrMessage, message);
  }

  info(message: string): void;
  info(obj: LogObj): void;
  info(obj: LogObj, message: string): void;
  info(objOrMessage: LogObj | string, message?: string): void {
    this.write('info', objOrMessage, message);
  }

  warn(message: string): void;
  warn(obj: LogObj): void;
  warn(obj: LogObj, message: string): void;
  warn(objOrMessage: LogObj | string, message?: string): void {
    this.write('warn', objOrMessage, message);
  }

  error(message: string): void;
  error(obj: LogObj): void;
  error(obj: LogObj, message: string): void;
  error(objOrMessage: LogObj | string, message?: string): void {
    this.write('error', objOrMessage, message);
  }

  fatal(message: string): void;
  fatal(obj: LogObj): void;
  fatal(obj: LogObj, message: string): void;
  fatal(objOrMessage: LogObj | string, message?: string): void {
    this.write('fatal', objOrMessage, message);
  }

  private write(level: LogLevel, objOrMessage: LogObj | string, message?: string): void {
    if (typeof objOrMessage === 'string') {
      this.pinoLogger[level](objOrMessage);
      return;
    }

    this.pinoLogger[level](objOrMessage, message);
  }
}
