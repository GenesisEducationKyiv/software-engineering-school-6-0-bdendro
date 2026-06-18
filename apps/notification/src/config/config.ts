import dotenv from 'dotenv';
import { z } from 'zod';
import { ENV, ENV_FILES } from '../../../../libs/common/constants/env';
import { urlSchema } from '../../../../libs/common/utils/validation/common.schema';

const ENV_FILE_PATH = process.env.NODE_ENV === ENV.TEST ? ENV_FILES.TEST : ENV_FILES.ENV;
dotenv.config({ path: ENV_FILE_PATH, quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum([ENV.DEVELOPMENT, ENV.TEST, ENV.PRODUCTION]).default(ENV.DEVELOPMENT),

  RABBITMQ_URL: urlSchema,

  APP_NAME: z.string().trim().min(1),

  NOTIFICATION_PORT: z.coerce.number().int().min(1).max(65535).default(3002),

  EMAIL: z.email(),
  EMAIL_PASSWORD: z.string().min(1),
  EMAIL_HOST: z.string().trim().min(1),
  EMAIL_PORT: z.coerce.number().int().min(1).max(65535),
  EMAIL_SECURE: z.stringbool({
    truthy: ['true'],
    falsy: ['false'],
    error: 'EMAIL_SECURE must be "true" or "false"',
  }),
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
