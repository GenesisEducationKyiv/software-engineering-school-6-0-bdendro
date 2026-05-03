export const ENV = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

export type NodeEnv = (typeof ENV)[keyof typeof ENV];

export const ENV_FILES = {
  ENV: '.env',
  TEST: '.env.test',
} as const;
