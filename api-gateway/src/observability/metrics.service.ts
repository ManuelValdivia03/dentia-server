import { Injectable } from '@nestjs/common';

type MetricBucket = {
  count: number;
  totalMs: number;
  errors: number;
};

@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private readonly requests = new Map<string, MetricBucket>();

  recordRequest(
    method: string,
    route: string,
    statusCode: number,
    durationMs: number,
  ) {
    const key = `${method} ${route}`;
    const current = this.requests.get(key) ?? {
      count: 0,
      totalMs: 0,
      errors: 0,
    };

    current.count += 1;
    current.totalMs += durationMs;

    if (statusCode >= 400) {
      current.errors += 1;
    }

    this.requests.set(key, current);
  }

  toPrometheus(serviceName: string) {
    const lines = [
      '# HELP dentia_service_uptime_seconds Service uptime in seconds.',
      '# TYPE dentia_service_uptime_seconds gauge',
      `dentia_service_uptime_seconds{service="${serviceName}"} ${Math.floor(
        (Date.now() - this.startedAt) / 1000,
      )}`,
      '# HELP dentia_http_requests_total Total HTTP requests by route.',
      '# TYPE dentia_http_requests_total counter',
      '# HELP dentia_http_request_errors_total Total HTTP request errors by route.',
      '# TYPE dentia_http_request_errors_total counter',
      '# HELP dentia_http_request_duration_ms_avg Average HTTP request duration in ms by route.',
      '# TYPE dentia_http_request_duration_ms_avg gauge',
    ];

    for (const [route, bucket] of this.requests.entries()) {
      const labels = `{service="${serviceName}",route="${this.escapeLabel(route)}"}`;
      lines.push(`dentia_http_requests_total${labels} ${bucket.count}`);
      lines.push(`dentia_http_request_errors_total${labels} ${bucket.errors}`);
      lines.push(
        `dentia_http_request_duration_ms_avg${labels} ${(
          bucket.totalMs / bucket.count
        ).toFixed(2)}`,
      );
    }

    return `${lines.join('\n')}\n`;
  }

  private escapeLabel(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
}
