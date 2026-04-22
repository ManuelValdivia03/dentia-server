import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { RequestUser } from './interfaces/request-user.interface';

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject('APPOINTMENTS_SERVICE')
    private readonly client: ClientProxy,
  ) {}

  findAll(requester: RequestUser) {
    return firstValueFrom(
      this.client.send({ cmd: 'appointments.findAll' }, { requester }),
    );
  }

  findOne(id: string, requester: RequestUser) {
    return firstValueFrom(
      this.client.send({ cmd: 'appointments.findOne' }, { id, requester }),
    );
  }

  getAvailability(dentistId: string, date: string, requester: RequestUser) {
    return firstValueFrom(
      this.client.send(
        { cmd: 'appointments.availability' },
        { dentistId, date, requester },
      ),
    );
  }

  create(dto: CreateAppointmentDto, requester: RequestUser) {
    return firstValueFrom(
      this.client.send({ cmd: 'appointments.create' }, { dto, requester }),
    );
  }

  reschedule(id: string, dto: RescheduleAppointmentDto, requester: RequestUser) {
    return firstValueFrom(
      this.client.send(
        { cmd: 'appointments.reschedule' },
        { id, dto, requester },
      ),
    );
  }

  cancel(id: string, requester: RequestUser) {
    return firstValueFrom(
      this.client.send({ cmd: 'appointments.cancel' }, { id, requester }),
    );
  }

  confirm(id: string, requester: RequestUser) {
    return firstValueFrom(
      this.client.send({ cmd: 'appointments.confirm' }, { id, requester }),
    );
  }

  complete(id: string, requester: RequestUser) {
    return firstValueFrom(
      this.client.send({ cmd: 'appointments.complete' }, { id, requester }),
    );
  }
}
