import type { NextFunction, Request, Response } from 'express';
import {
  httpRequestDurationSeconds,
  httpRequestErrorsTotal,
  httpRequestsTotal,
} from '../../metrics/metrics.registry';

type RequestRoute = { path: string | RegExp | (RegExp | string)[] } | undefined;

function getRouteLabel(req: Request): string {
  const routePath = (req.route as RequestRoute)?.path;

  if (!routePath) {
    return 'unknown';
  }

  return `${req.baseUrl}${String(routePath)}`;
}

function isServerError(statusCode: number): boolean {
  return statusCode >= 500;
}

export function httpMetrics(req: Request, res: Response, next: NextFunction) {
  const endTimer = httpRequestDurationSeconds.startTimer();

  res.once('finish', () => {
    const labels = {
      method: req.method,
      route: getRouteLabel(req),
      status_code: res.statusCode.toString(),
    };

    httpRequestsTotal.inc(labels);

    if (isServerError(res.statusCode)) {
      httpRequestErrorsTotal.inc(labels);
    }

    endTimer(labels);
  });

  next();
}
