import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    const database = await this.checkDatabase();
    const email = this.checkEmail();
    const status = database.status === 'ok' ? 'ok' : 'degraded';

    if (status !== 'ok') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status,
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      checks: {
        database,
        email,
        jwt: {
          status: process.env.JWT_SECRET ? 'ok' : 'missing',
        },
      },
    };
  }

  private async checkDatabase() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'down',
        reason: error instanceof Error ? error.message : 'unknown',
      };
    }
  }

  private checkEmail() {
    const configured = Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
    );

    return {
      status: configured ? 'ok' : 'dev-mode',
      configured,
    };
  }
}
