import express, { Application, NextFunction, Request, Response } from 'express';
import { AppContainer } from './container';
import { createErrorHandler } from './common/middlewares/error-handler';
import { createApiRouter } from './routes';

export function createApp(container: AppContainer): Application {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/', createApiRouter(container.controllers.emailController));

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ message: 'Service is healthy.' });
  });

  app.use((_req: Request, res: Response, _next: NextFunction) => {
    res.status(404).json({ message: 'Not Found' });
  });

  app.use(createErrorHandler(container.logger));

  return app;
}
