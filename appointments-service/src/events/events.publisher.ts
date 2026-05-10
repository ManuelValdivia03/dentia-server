import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { AppointmentEvents } from './event-names';

@Injectable()
export class EventsPublisher implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly client: ClientProxy,
  ) {}

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  async publishAppointmentCreated(payload: {
    appointmentId: string;
    patientId: string;
    dentistId: string;
    startAt: string;
    endAt: string;
    status: string;
  }) {
    const event = {
      eventId: randomUUID(),
      type: AppointmentEvents.Created,
      occurredAt: new Date().toISOString(),
      data: payload,
    };

    await firstValueFrom(
      this.client.emit(AppointmentEvents.Created, event),
    );
  }
}