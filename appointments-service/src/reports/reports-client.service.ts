import { Injectable, Logger } from '@nestjs/common';

export interface AppointmentReportSnapshot {
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  status: string;
  scheduled_at: string;
  duration_minutes: number;
}

@Injectable()
export class ReportsClientService {
  private readonly logger = new Logger(ReportsClientService.name);

  private readonly reportsServiceUrl =
    process.env.REPORTS_SERVICE_URL ?? 'http://reports-service:3006';

  private readonly internalApiKey =
    process.env.INTERNAL_API_KEY ?? 'dev-internal-key';

  async sendAppointmentSnapshot(snapshot: AppointmentReportSnapshot): Promise<void> {
    try {
      const response = await fetch(
        `${this.reportsServiceUrl}/reports/snapshots/appointments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': this.internalApiKey,
          },
          body: JSON.stringify(snapshot),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();

        this.logger.warn(
          `reports-service rejected appointment snapshot. Status=${response.status}. Body=${errorBody}`,
        );

        return;
      }

      this.logger.log(
        `Appointment snapshot sent to reports-service: ${snapshot.appointment_id}`,
      );
    } catch (error) {
      this.logger.warn(
        `reports-service unavailable. Appointment snapshot was not sent: ${snapshot.appointment_id}`,
      );
    }
  }
}