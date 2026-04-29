import dotenv from 'dotenv';
import { z } from 'zod';
import { ENV, ENV_FILES } from '../common/constants/env';
import ms from 'ms';

const ENV_FILE_PATH = process.env.NODE_ENV === ENV.TEST ? ENV_FILES.TEST : ENV_FILES.ENV;
dotenv.config({ path: ENV_FILE_PATH });

const envSchema = z.object({
  NODE_ENV: z.enum([ENV.DEVELOPMENT, ENV.TEST, ENV.PRODUCTION]).default(ENV.DEVELOPMENT),

  APP_NAME: z.string().trim().min(1),
  APP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_BASE_URL: z.url({ protocol: /^https?$/ }),
  APP_TIMEZONE: z
    .string()
    .trim()
    .min(1)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, 'APP_TIMEZONE must be a valid IANA timezone'),

  DATABASE_URL: z.url({ normalize: true }).min(1),

  EMAIL: z.email(),
  EMAIL_PASSWORD: z.string().min(1),
  EMAIL_HOST: z.string().trim().min(1),
  EMAIL_PORT: z.coerce.number().int().min(1).max(65535),
  EMAIL_SECURE: z.stringbool({
    truthy: ['true'],
    falsy: ['false'],
    error: 'EMAIL_SECURE must be "true" or "false"',
  }),

  GITHUB_TOKEN: z.string().trim().min(1),
  GITHUB_API_URL: z.url({ protocol: /^https?$/ }),

  UNCONFIRMED_EXPIRATION_TIME: z
    .string()
    .trim()
    .min(1)
    .refine(
      (value) => typeof ms(value as ms.StringValue) === 'number',
      'UNCONFIRMED_EXPIRATION_TIME must be a valid duration (like 10m, 1h, 2d)',
    )
    .default('5m'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => {
      const path = issue.path.join('.') || 'env';
      return `${path}: ${issue.message}`;
    })
    .join('\n');

  throw new Error(`Invalid environment variables:\n${details}`);
}

export const env = parsedEnv.data;
export type Env = z.output<typeof envSchema>;
