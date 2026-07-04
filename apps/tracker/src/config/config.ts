import dotenv from 'dotenv';
import { z } from 'zod';
import { ENV, ENV_FILES } from '../../../../libs/common/constants/env';
import { urlSchema } from '../../../../libs/common/utils/validation/common.schema';

const ENV_FILE_PATH = process.env.NODE_ENV === ENV.TEST ? ENV_FILES.TEST : ENV_FILES.ENV;
dotenv.config({ path: ENV_FILE_PATH, quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum([ENV.DEVELOPMENT, ENV.TEST, ENV.PRODUCTION]).default(ENV.DEVELOPMENT),

  RABBITMQ_URL: urlSchema,

  TRACKER_PORT: z.coerce.number().int().min(1).max(65535).default(3003),

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

  GITHUB_SERVICE_URL: z.url(),
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
