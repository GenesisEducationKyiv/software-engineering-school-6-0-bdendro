import { Router } from 'express';
import { SUBSCRIPTION_ROUTE_PATHS } from './constants/subscriptions.const';
import { SubscriptionControllerInterface } from './interfaces/subscription.controller.interface';
import { validateRequest } from '../../../libs/common/middlewares/validate-request';
import {
  GetSubscriptionOperationParams,
  getSubscriptionOperationParamsSchema,
  SubscribeBody,
  subscribeBodySchema,
  SubscriptionsQuery,
  subscriptionsQuerySchema,
  TokenParams,
  tokenParamsSchema,
} from './schemas/subscription.schema';
import {
  RequestWithValidatedBody,
  RequestWithValidatedParams,
  RequestWithValidatedQuery,
} from '../../../libs/common/types/validated-request';

export function createSubscriptionRouter(
  subscriptionController: SubscriptionControllerInterface,
): Router {
  const router = Router();

  router.post(
    `/${SUBSCRIPTION_ROUTE_PATHS.SUBSCRIBE}`,
    validateRequest({ body: subscribeBodySchema }),
    async (req, res) => {
      await subscriptionController.subscribe(req as RequestWithValidatedBody<SubscribeBody>, res);
    },
  );

  router.get(
    `/${SUBSCRIPTION_ROUTE_PATHS.CONFIRM}/:${SUBSCRIPTION_ROUTE_PATHS.TOKEN}`,
    validateRequest({ params: tokenParamsSchema }),
    async (req, res) => {
      await subscriptionController.confirm(req as RequestWithValidatedParams<TokenParams>, res);
    },
  );

  router.get(
    `/${SUBSCRIPTION_ROUTE_PATHS.UNSUBSCRIBE}/:${SUBSCRIPTION_ROUTE_PATHS.TOKEN}`,
    validateRequest({ params: tokenParamsSchema }),
    async (req, res) => {
      await subscriptionController.unsubscribe(req as RequestWithValidatedParams<TokenParams>, res);
    },
  );

  router.get(
    `/${SUBSCRIPTION_ROUTE_PATHS.SUBSCRIPTIONS}`,
    validateRequest({ query: subscriptionsQuerySchema }),
    async (req, res) => {
      await subscriptionController.getSubscriptionsByEmail(
        req as RequestWithValidatedQuery<SubscriptionsQuery>,
        res,
      );
    },
  );

  router.get(
    `/${SUBSCRIPTION_ROUTE_PATHS.SUBSCRIPTION_OPERATIONS}/:${SUBSCRIPTION_ROUTE_PATHS.OPERATION_ID}`,
    validateRequest({ params: getSubscriptionOperationParamsSchema }),
    async (req, res) => {
      await subscriptionController.getSubscriptionOperation(
        req as RequestWithValidatedParams<GetSubscriptionOperationParams>,
        res,
      );
    },
  );

  return router;
}
