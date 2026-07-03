import { Request, Response, Router } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { AppContainer } from './container';
import { RequestWithValidatedParams } from '../../../libs/common/types/validated-request';
import { validateRequest } from '../../../libs/common/middlewares/validate-request';
import { GITHUB_ROUTE_PATH_PATTERNS } from '../../../libs/contracts/github/rest/github.const';
import { repoParamsSchema } from '../../../libs/contracts/github/rest/github.contract';

type ControllerMethod<ReqParams extends ParamsDictionary> = (
  req: RequestWithValidatedParams<ReqParams>,
  res: Response,
) => Promise<void> | void;

function controllerMethodWrapper<ReqParams extends ParamsDictionary>(
  method: ControllerMethod<ReqParams>,
) {
  return (req: Request, res: Response) => {
    return method(req as RequestWithValidatedParams<ReqParams>, res);
  };
}

export function createApiRouter(
  githubController: AppContainer['controllers']['githubController'],
): Router {
  const router = Router();

  router.get(
    GITHUB_ROUTE_PATH_PATTERNS.REPOSITORY_EXISTS,
    validateRequest({ params: repoParamsSchema }),
    controllerMethodWrapper(githubController.isRepositoryExists.bind(githubController)),
  );
  router.get(
    GITHUB_ROUTE_PATH_PATTERNS.LATEST_RELEASE,
    validateRequest({ params: repoParamsSchema }),
    controllerMethodWrapper(githubController.getLatestRelease.bind(githubController)),
  );

  return router;
}
