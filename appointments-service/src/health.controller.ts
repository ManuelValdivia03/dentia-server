import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      ok: true,
      service: 'appointments-service',
      timestamp: new Date().toISOString(),
    };
  }
}