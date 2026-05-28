import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { RequestUser } from './interfaces/request-user.interface';

@Injectable()
export class PrescriptionsService {
  constructor(
    @Inject('PRESCRIPTIONS_SERVICE')
    private readonly client: ClientProxy,
  ) {}

  create(dto: CreatePrescriptionDto, requester: RequestUser) {
    return firstValueFrom(
      this.client.send({ cmd: 'prescriptions.create' }, { dto, requester }),
    );
  }

  findOne(id: string, requester: RequestUser) {
    return firstValueFrom(
      this.client.send({ cmd: 'prescriptions.findOne' }, { id, requester }),
    );
  }

  findByAppointment(appointmentId: string, requester: RequestUser) {
    return firstValueFrom(
      this.client.send(
        { cmd: 'prescriptions.findByAppointment' },
        { appointmentId, requester },
      ),
    );
  }

  generatePdf(id: string, requester: RequestUser) {
    return firstValueFrom(
      this.client.send(
        { cmd: 'prescriptions.generatePdf' },
        { id, requester },
      ),
    );
  }
}