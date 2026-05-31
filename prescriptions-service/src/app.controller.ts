import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Verificar estado del servicio' })
  @ApiOkResponse({ description: 'Servicio funcionando correctamente' })
  health() {
    return {
      status: 'ok',
      service: 'prescriptions-service',
    };
  }
}