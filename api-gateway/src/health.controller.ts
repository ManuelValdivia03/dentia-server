import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

type DependencyCheck = {
  status: 'ok' | 'down';
  url: string;
  latencyMs?: number;
  statusCode?: number;
  reason?: string;
};

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Verificar estado del API Gateway' })
  @ApiOkResponse({ description: 'Gateway disponible.' })
  async check() {
    const dependencies = await this.checkDependencies();
    const status = Object.values(dependencies).every(
      (dependency) => dependency.status === 'ok',
    )
      ? 'ok'
      : 'degraded';

    return {
      status,
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      checks: {
        configuration: this.checkConfiguration(),
        dependencies,
      },
    };
  }

  private checkConfiguration() {
    const required = [
      'AUTH_SERVICE_URL',
      'APPOINTMENTS_SERVICE_URL',
      'CHAT_SERVICE_URL',
      'FILES_SERVICE_URL',
      'REPORTS_SERVICE_URL',
      'JWT_SECRET',
    ];

    const missing = required.filter((key) => !process.env[key]);

    return {
      status: missing.length === 0 ? 'ok' : 'missing',
      missing,
    };
  }

  private async checkDependencies() {
    const dependencies = {
      authService: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001',
      appointmentsService:
        process.env.APPOINTMENTS_SERVICE_URL ?? 'http://localhost:3002',
      prescriptionsService:
        process.env.PRESCRIPTIONS_SERVICE_URL ?? 'http://localhost:3003',
      chatService: process.env.CHAT_SERVICE_URL ?? 'http://localhost:3004',
      filesService: process.env.FILES_SERVICE_URL ?? 'http://localhost:3005',
      reportsService:
        process.env.REPORTS_SERVICE_URL ?? 'http://localhost:3006',
    };

    const entries = await Promise.all(
      Object.entries(dependencies).map(async ([name, baseUrl]) => [
        name,
        await this.checkUrl(`${baseUrl}/health`),
      ]),
    );

    return Object.fromEntries(entries) as Record<string, DependencyCheck>;
  }

  private async checkUrl(url: string): Promise<DependencyCheck> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    try {
      const response = await fetch(url, { signal: controller.signal });
      return {
        status: response.ok ? 'ok' : 'down',
        url,
        statusCode: response.status,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: 'down',
        url,
        latencyMs: Date.now() - startedAt,
        reason: error instanceof Error ? error.message : 'unknown',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
