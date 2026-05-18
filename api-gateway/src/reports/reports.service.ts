import {
  BadGatewayException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ReportsService {
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

  private handleReportsError(error: any): never {
    const status = error?.response?.status;
    const data = error?.response?.data;

    if (status) {
      throw new HttpException(data, status);
    }

    throw new BadGatewayException('reports-service is not available');
  }
}