import express, { Application, NextFunction, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { AppContainer } from './container';
import { createApiRouter } from './routes';
import { createErrorHandler } from './common/middlewares/error-handler';
import helmet from 'helmet';
import path, { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { createMetricsRouter } from '../libs/infrastructure/metrics/metrics.router';
import { httpMetrics } from '../libs/common/middlewares/http-metrics';

const swaggerDocumentPath = join(__dirname, '..', 'docs', 'swagger.json');
const swaggerDocument = JSON.parse(readFileSync(swaggerDocumentPath, 'utf8')) as Record<
  string,
  unknown
>;

export function createApp(container: AppContainer): Application {
  const app = express();

  app.use(helmet());

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/metrics', createMetricsRouter(container.controllers.metricsController));

  app.use('/api', httpMetrics, createApiRouter(container.controllers));

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.use((_req: Request, res: Response, _next: NextFunction) => {
    res.status(404).json({ message: 'Not Found' });
  });

  app.use(createErrorHandler(container.logger));

  return app;
}
