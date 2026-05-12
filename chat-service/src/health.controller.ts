import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      service: 'chat-service',
      timestamp: new Date().toISOString(),
    };
  }
}