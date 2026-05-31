import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Verificar estado del API Gateway' })
  @ApiOkResponse({ description: 'Gateway disponible.' })
  check() {
    return {
      ok: true,
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    };
  }
}
