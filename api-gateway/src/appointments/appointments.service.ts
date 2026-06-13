import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  private readonly appointmentsServiceUrl =
    process.env.APPOINTMENTS_SERVICE_URL ?? 'http://appointments-service:3002';

  async findAll(authHeader: string) {
    return this.request('/appointments', {
      method: 'GET',
      authHeader,
    });
  }

  async findByDay(date: string, dentistId: string | undefined, authHeader: string) {
    const query = new URLSearchParams();

    if (date) {
      query.set('date', date);
    }

    if (dentistId) {
      query.set('dentistId', dentistId);
    }

    return this.request(`/appointments/day?${query.toString()}`, {
      method: 'GET',
      authHeader,
    });
  }

  async findPreviousDentistIds(authHeader: string) {
    return this.request('/appointments/patient/dentists', {
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
    this.validateAppointmentRange(dto.startAt, dto.endAt);

    return this.request('/appointments', {
      method: 'POST',
      authHeader,
      body: dto,
    });
  }

  async reschedule(
    id: string,
    dto: RescheduleAppointmentDto,
    authHeader: string,
  ) {
    this.validateAppointmentRange(dto.startAt, dto.endAt);

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

  async createRating(id: string, dto: any, authHeader: string) {
    return this.request(`/appointments/${id}/rating`, {
      method: 'POST',
      authHeader,
      body: dto,
    });
  }

  async getDentistRatingsSummary(dentistId: string, authHeader: string) {
    return this.request(`/dentists/${dentistId}/ratings/summary`, {
      method: 'GET',
      authHeader,
    });
  }

  async createPayment(
    appointmentId: string,
    dto: CreatePaymentDto,
    authHeader: string,
  ) {
    return this.request(`/payments/appointments/${appointmentId}`, {
      method: 'POST',
      authHeader,
      body: dto,
    });
  }

  async getPayments(
    from: string | undefined,
    to: string | undefined,
    dentistId: string | undefined,
    authHeader: string,
  ) {
    const query = new URLSearchParams();

    if (from) query.set('from', from);
    if (to) query.set('to', to);
    if (dentistId) query.set('dentistId', dentistId);

    return this.request(`/payments?${query.toString()}`, {
      method: 'GET',
      authHeader,
    });
  }

  async getPaymentPeriods(
    dentistId: string | undefined,
    authHeader: string,
  ) {
    const query = new URLSearchParams();
    if (dentistId) query.set('dentistId', dentistId);

    return this.request(`/payments/periods?${query.toString()}`, {
      method: 'GET',
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

        this.logServiceFailure(path, response.status);
        throw new HttpException(message, response.status);
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logServiceFailure(path);
      throw new ServiceUnavailableException(
        'appointments-service is unavailable',
      );
    }
  }

  private validateAppointmentRange(startAtValue: string, endAtValue: string) {
    const startAtKey = this.toClinicDateTimeKey(startAtValue);
    const endAtKey = this.toClinicDateTimeKey(endAtValue);

    if (!startAtKey || !endAtKey) {
      throw new BadRequestException('startAt and endAt must be valid dates');
    }

    if (startAtKey >= endAtKey) {
      throw new BadRequestException('startAt must be before endAt');
    }

    if (startAtKey <= this.getClinicNowKey()) {
      throw new BadRequestException('startAt must be in the future');
    }
  }

  private toClinicDateTimeKey(value: string) {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);

    if (!match) {
      return '';
    }

    return `${match[1]}T${match[2]}:${match[3]}`;
  }

  private getClinicNowKey() {
    const timeZone =
      process.env.APPOINTMENTS_TIME_ZONE ?? 'America/Mexico_City';

    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );

    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
  }

  private logServiceFailure(path: string, statusCode?: number) {
    this.logger.warn(
      JSON.stringify({
        event: 'service_call_failed',
        service: 'api-gateway',
        targetService: 'appointments-service',
        path,
        statusCode,
      }),
    );
  }
}
