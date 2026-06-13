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

  async findAll(authHeader: string): Promise<AppointmentSummary[]> {
    const response = await fetch(`${this.appointmentsServiceUrl}/appointments`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    }).catch(() => {
      throw new ServiceUnavailableException(
        'appointments-service is unavailable',
      );
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new HttpException(
        data?.message ?? data?.title ?? 'No se pudieron consultar las citas',
        response.status,
      );
    }

    if (Array.isArray(data)) {
      return data as AppointmentSummary[];
    }

    if (Array.isArray(data?.items)) {
      return data.items as AppointmentSummary[];
    }

    if (Array.isArray(data?.appointments)) {
      return data.appointments as AppointmentSummary[];
    }

    return [];
  }

  async hasDentistPatientRelation(
    dentistId: string,
    patientId: string,
    authHeader: string,
  ): Promise<boolean> {
    const appointments = await this.findAll(authHeader);

    return appointments.some(
      (appointment) =>
        appointment.dentistId === dentistId &&
        appointment.patientId === patientId,
    );
  }
}