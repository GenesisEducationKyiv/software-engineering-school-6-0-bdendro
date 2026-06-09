import { ENV } from '../common/constants/env';
import { LoggerConfig } from '../infrastructure/logger/interfaces/logger.interface';
import { Env } from './env';

const LOG_LEVELS_BY_ENV = {
  [ENV.DEVELOPMENT]: 'debug',
  [ENV.TEST]: 'error',
  [ENV.PRODUCTION]: 'info',
} as const;

type LoggerConfigEnv = Pick<Env, 'APP_NAME' | 'NODE_ENV'>;

export function createLoggerConfig(env: LoggerConfigEnv): LoggerConfig {
  return {
    appName: env.APP_NAME,
    level: LOG_LEVELS_BY_ENV[env.NODE_ENV],
    pretty: env.NODE_ENV !== ENV.PRODUCTION,
  };
}
