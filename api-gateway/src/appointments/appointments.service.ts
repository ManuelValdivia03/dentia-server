import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject('APPOINTMENTS_SERVICE')
    private readonly client: ClientProxy,
  ) {}

  findAll() {
    return firstValueFrom(
      this.client.send({ cmd: 'appointments.findAll' }, {}),
    );
  }

  findOne(id: string) {
    return firstValueFrom(
      this.client.send({ cmd: 'appointments.findOne' }, { id }),
    );
  }

  getAvailability(dentistId: string, date: string) {
    return firstValueFrom(
      this.client.send(
        { cmd: 'appointments.availability' },
        { dentistId, date },
      ),
    );
  }

  create(dto: CreateAppointmentDto) {
    return firstValueFrom(
      this.client.send({ cmd: 'appointments.create' }, dto),
    );
  }

  reschedule(id: string, dto: RescheduleAppointmentDto) {
    return firstValueFrom(
      this.client.send(
        { cmd: 'appointments.reschedule' },
        { id, dto },
      ),
    );
  }

  cancel(id: string) {
    return firstValueFrom(
      this.client.send({ cmd: 'appointments.cancel' }, { id }),
    );
  }

  confirm(id: string) {
    return firstValueFrom(
      this.client.send({ cmd: 'appointments.confirm' }, { id }),
    );
  }

  complete(id: string) {
    return firstValueFrom(
      this.client.send({ cmd: 'appointments.complete' }, { id }),
    );
  }
}