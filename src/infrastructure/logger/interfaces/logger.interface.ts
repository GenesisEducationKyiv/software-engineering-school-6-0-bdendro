export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerConfig {
  appName: string;
  level: LogLevel;
  pretty: boolean;
}

export type LogObj = object;

export interface AppLogger {
  debug(message: string): void;
  debug(obj: LogObj): void;
  debug(obj: LogObj, message: string): void;

  info(message: string): void;
  info(obj: LogObj): void;
  info(obj: LogObj, message: string): void;

  warn(message: string): void;
  warn(obj: LogObj): void;
  warn(obj: LogObj, message: string): void;

  error(message: string): void;
  error(obj: LogObj): void;
  error(obj: LogObj, message: string): void;

  fatal(message: string): void;
  fatal(obj: LogObj): void;
  fatal(obj: LogObj, message: string): void;
}
