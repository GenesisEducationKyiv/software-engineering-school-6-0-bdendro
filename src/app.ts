import express, { Application, NextFunction, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { AppContainer } from './container';
import { createRouter } from './routes';
import { errorHandler } from './common/middlewares/error-handler';
import helmet from 'helmet';
import swaggerDocument from '../docs/swagger.json';

export function createApp(container: AppContainer): Application {
  const app = express();

  app.use(helmet());

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', createRouter(container.controllers));

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.use((_req: Request, res: Response, _next: NextFunction) => {
    res.status(404).json({ message: 'Not Found' });
  });

  app.use(errorHandler);

  return app;
}
