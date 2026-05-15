import { Router } from 'express';
import { AppContainer } from './container';
import { createSubscriptionRouter } from './subscriptions/subscriptions.router';

export function createRouter(controllers: AppContainer['controllers']): Router {
  const router = Router();

  router.use('/', createSubscriptionRouter(controllers.subscriptionController));

  return router;
}
