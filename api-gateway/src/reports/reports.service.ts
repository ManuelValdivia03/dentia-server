import {
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  private readonly reportsServiceUrl =
    process.env.REPORTS_SERVICE_URL ?? 'http://reports-service:3006';

  constructor(private readonly httpService: HttpService) {}

  async getDashboardSummary(authorization: string, doctorId?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.reportsServiceUrl}/reports/dashboard/summary`,
          {
            headers: {
              Authorization: authorization,
            },
            params: {
              doctor_id: doctorId,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleReportsError(error);
    }
  }

  async getAppointmentsByStatus(authorization: string, doctorId?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.reportsServiceUrl}/reports/appointments/by-status`,
          {
            headers: {
              Authorization: authorization,
            },
            params: {
              doctor_id: doctorId,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleReportsError(error);
    }
  }

  async exportAppointmentsByStatus(authorization: string, doctorId?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.reportsServiceUrl}/reports/export/appointments-by-status`,
          {
            headers: {
              Authorization: authorization,
            },
            params: {
              doctor_id: doctorId,
            },
            responseType: 'arraybuffer',
          },
        ),
      );

      return {
        buffer: Buffer.from(response.data),
        headers: response.headers,
      };
    } catch (error) {
      this.handleReportsError(error);
    }
  }

  private handleReportsError(error: any): never {
    const status = error?.response?.status;
    const data = error?.response?.data;

    if (status) {
      this.logServiceFailure(status);
      throw new HttpException(data, status);
    }

    this.logServiceFailure();
    throw new BadGatewayException('reports-service is not available');
  }

  private logServiceFailure(statusCode?: number) {
    this.logger.warn(
      JSON.stringify({
        event: 'service_call_failed',
        service: 'api-gateway',
        targetService: 'reports-service',
        statusCode,
      }),
    );
  }
}
