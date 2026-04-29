import { env } from '../../config/env';
import { SUBSCRIPTION_ROUTE_PATHS } from '../../subscriptions/constants/subscriptions.const';

export const EMAIL = {
  CONFIRMATION_BASE_URL: `${env.APP_BASE_URL}/${SUBSCRIPTION_ROUTE_PATHS.CONFIRM}`,
  UNSUBSCRIBE_BASE_URL: `${env.APP_BASE_URL}/${SUBSCRIPTION_ROUTE_PATHS.UNSUBSCRIBE}`,
  SUBJECT_CONFIRMATION: 'GitHub Repository subscription confirmation',
  SUBJECT_REPO: 'GitHub Repository update report',
  SUBJECT_CONFIRMED: 'GitHub Repository subscription confirmed',
  SUBJECT_CANCELED: 'GitHub Repository subscription canceled',
};
