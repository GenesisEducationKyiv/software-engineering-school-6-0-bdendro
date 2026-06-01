import { Router } from 'express';
import { MetricsController } from './metrics.controller';
import { METRICS_ROUTE_PATHS } from './constants/metrics.const';

export function createMetricsRouter(metricsController: MetricsController): Router {
  const router = Router();

  router.get(METRICS_ROUTE_PATHS.GET_METRICS, metricsController.getMetrics.bind(metricsController));

  return router;
}
