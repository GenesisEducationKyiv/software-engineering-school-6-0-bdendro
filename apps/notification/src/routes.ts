import { Request, Response, Router } from 'express';
import { AppContainer } from './container';
import { NOTIFICATION_ROUTE_PATHS } from '../../../libs/contracts/notification/notification.const';
import { RequestWithValidatedBody } from '../../../libs/common/types/validated-request';
import { validateRequest } from '../../../libs/common/middlewares/validate-request';
import {
  sendConfirmationBodySchema,
  sendConfirmationSuccessBodySchema,
  sendRepositoryReleaseBodySchema,
  sendUnsubscribeSuccessBodySchema,
} from '../../../libs/contracts/notification/notification.contract';

type ControllerMethod<ReqBody> = (
  req: RequestWithValidatedBody<ReqBody>,
  res: Response,
) => Promise<void> | void;

function controllerMethodWrapper<ReqBody>(method: ControllerMethod<ReqBody>) {
  return (req: Request, res: Response) => {
    return method(req as RequestWithValidatedBody<ReqBody>, res);
  };
}

export function createApiRouter(
  emailController: AppContainer['controllers']['emailController'],
): Router {
  const router = Router();

  router.use(
    NOTIFICATION_ROUTE_PATHS.CONFIRMATION,
    validateRequest({ body: sendConfirmationBodySchema }),
    controllerMethodWrapper(emailController.sendConfirmationEmail.bind(emailController)),
  );
  router.use(
    NOTIFICATION_ROUTE_PATHS.CONFIRMATION_SUCCESS,
    validateRequest({ body: sendConfirmationSuccessBodySchema }),

    controllerMethodWrapper(emailController.sendConfirmationSuccessEmail.bind(emailController)),
  );
  router.use(
    NOTIFICATION_ROUTE_PATHS.UNSUBSCRIBE_SUCCESS,
    validateRequest({ body: sendUnsubscribeSuccessBodySchema }),
    controllerMethodWrapper(emailController.sendUnsubscribeSuccessEmail.bind(emailController)),
  );
  router.use(
    NOTIFICATION_ROUTE_PATHS.REPOSITORY_RELEASE,
    validateRequest({ body: sendRepositoryReleaseBodySchema }),
    controllerMethodWrapper(emailController.sendGitHubReleaseEmail.bind(emailController)),
  );

  return router;
}
