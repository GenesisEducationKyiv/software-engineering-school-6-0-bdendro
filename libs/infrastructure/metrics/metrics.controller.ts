import { Request, Response } from 'express';
import { getMetrics, getMetricsContentType } from './metrics.registry';

export class MetricsController {
  constructor() {}

  async getMetrics(_req: Request, res: Response<string>): Promise<void> {
    res.set('Content-Type', getMetricsContentType());
    res.end(await getMetrics());
  }
}
