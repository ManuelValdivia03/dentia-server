import { HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@Injectable()
export class AppointmentsService {
  private readonly appointmentsServiceUrl =
    process.env.APPOINTMENTS_SERVICE_URL ?? 'http://appointments-service:3002';

  async findAll(authHeader: string) {
    return this.request('/appointments', {
      method: 'GET',
      authHeader,
    });
  }

  async findOne(id: string, authHeader: string) {
    return this.request(`/appointments/${id}`, {
      method: 'GET',
      authHeader,
    });
  }

  async getAvailability(dentistId: string, date: string, authHeader: string) {
    const query = new URLSearchParams();

    if (dentistId) {
      query.set('dentistId', dentistId);
    }

    if (date) {
      query.set('date', date);
    }

    return this.request(`/appointments/availability?${query.toString()}`, {
      method: 'GET',
      authHeader,
    });
  }

  async create(dto: CreateAppointmentDto, authHeader: string) {
    return this.request('/appointments', {
      method: 'POST',
      authHeader,
      body: dto,
    });
  }

  async reschedule(id: string, dto: RescheduleAppointmentDto, authHeader: string) {
    return this.request(`/appointments/${id}/reschedule`, {
      method: 'PATCH',
      authHeader,
      body: dto,
    });
  }

  async cancel(id: string, authHeader: string) {
    return this.request(`/appointments/${id}/cancel`, {
      method: 'PATCH',
      authHeader,
    });
  }

  async confirm(id: string, authHeader: string) {
    return this.request(`/appointments/${id}/confirm`, {
      method: 'PATCH',
      authHeader,
    });
  }

  async complete(id: string, authHeader: string) {
    return this.request(`/appointments/${id}/complete`, {
      method: 'PATCH',
      authHeader,
    });
  }

  private async request(
    path: string,
    options: {
      method: 'GET' | 'POST' | 'PATCH';
      authHeader: string;
      body?: unknown;
    },
  ) {
    const url = `${this.appointmentsServiceUrl}${path}`;

    try {
      const response = await fetch(url, {
        method: options.method,
        headers: {
          Authorization: options.authHeader,
          'Content-Type': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok) {
        const message =
          data?.message ??
          data?.title ??
          `appointments-service error: ${response.status}`;

        throw new HttpException(message, response.status);
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        'appointments-service is unavailable',
      );
    }
  }
}