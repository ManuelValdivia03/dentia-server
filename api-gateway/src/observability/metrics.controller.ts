import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('Observability')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  @ApiOperation({ summary: 'Exponer metricas basicas del gateway' })
  @ApiOkResponse({ description: 'Metricas en formato Prometheus text.' })
  metrics() {
    return this.metricsService.toPrometheus('api-gateway');
  }
}
