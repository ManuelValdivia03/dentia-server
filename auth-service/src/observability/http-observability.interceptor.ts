import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpObservabilityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpObservabilityInterceptor.name);

  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => this.record(request, response, startedAt)),
      catchError((error) => {
        this.record(request, response, startedAt, error);
        return throwError(() => error);
      }),
    );
  }

  private record(
    request: Request,
    response: Response,
    startedAt: number,
    error?: { status?: number; statusCode?: number; name?: string },
  ) {
    const durationMs = Date.now() - startedAt;
    const route = request.route?.path ?? request.path ?? request.url;
    const statusCode =
      error?.status ?? error?.statusCode ?? response.statusCode;

    this.metricsService.recordRequest(
      request.method,
      String(route),
      statusCode,
      durationMs,
    );

    this.logger.log(
      JSON.stringify({
        event: 'http_request',
        service: 'auth-service',
        method: request.method,
        route,
        statusCode,
        durationMs,
        error: error?.name,
      }),
    );
  }
}
