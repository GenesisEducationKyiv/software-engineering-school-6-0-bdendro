import express, { Application, NextFunction, Request, Response } from 'express';
import { AppContainer } from './container';

export function createApp(container: AppContainer): Application {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ message: 'Service is healthy.' });
  });

  app.use((_req: Request, res: Response, _next: NextFunction) => {
    res.status(404).json({ message: 'Not Found' });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    container.logger.error({ err }, 'Unknown server error');
    res.status(500).json({ message: 'Internal Server Error' });
  });

  return app;
}
