export const ENV = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

export const ENV_FILES = {
  ENV: '.env',
  TEST: '.env.test',
} as const;
