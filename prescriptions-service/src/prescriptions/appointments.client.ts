import {
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

export interface AppointmentSummary {
  id: string;
  patientId: string;
  dentistId: string;
  startAt: string;
  endAt: string;
  status: string;
}

@Injectable()
export class AppointmentsClient {
  private readonly appointmentsServiceUrl =
    process.env.APPOINTMENTS_SERVICE_URL ?? 'http://appointments-service:3002';

  async findOne(
    appointmentId: string,
    authHeader: string,
  ): Promise<AppointmentSummary> {
    const response = await fetch(
      `${this.appointmentsServiceUrl}/appointments/${appointmentId}`,
      {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      },
    ).catch(() => {
      throw new ServiceUnavailableException(
        'appointments-service is unavailable',
      );
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (response.status === 404) {
      throw new NotFoundException('Cita asociada no encontrada');
    }

    if (!response.ok) {
      throw new HttpException(
        data?.message ?? data?.title ?? 'No se pudo validar la cita asociada',
        response.status,
      );
    }

    return data as AppointmentSummary;
  }
}