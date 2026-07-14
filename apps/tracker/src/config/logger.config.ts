import { ENV } from '../../../../libs/common/constants/env';
import { LoggerConfig } from '../../../../libs/infrastructure/logger/interfaces/logger.interface';
import { Env } from './config';

const LOG_LEVELS_BY_ENV = {
  [ENV.DEVELOPMENT]: 'debug',
  [ENV.TEST]: 'error',
  [ENV.PRODUCTION]: 'info',
} as const;

type LoggerConfigEnv = Pick<Env, 'NODE_ENV'>;

export function createLoggerConfig(env: LoggerConfigEnv, appName: string): LoggerConfig {
  return {
    appName,
    level: LOG_LEVELS_BY_ENV[env.NODE_ENV],
    pretty: env.NODE_ENV !== ENV.PRODUCTION,
  };
}
