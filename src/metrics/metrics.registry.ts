import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();

type HttpMetricLabel = 'method' | 'route' | 'status_code';

collectDefaultMetrics({
  register: metricsRegistry,
});

export const httpRequestsTotal = new Counter<HttpMetricLabel>({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry],
});

export const httpRequestErrorsTotal = new Counter<HttpMetricLabel>({
  name: 'http_request_errors_total',
  help: 'Total number of failed HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry],
});

export const httpRequestDurationSeconds = new Histogram<HttpMetricLabel>({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

export function getMetricsContentType(): string {
  return metricsRegistry.contentType;
}

export async function getMetrics(): Promise<string> {
  return metricsRegistry.metrics();
}
