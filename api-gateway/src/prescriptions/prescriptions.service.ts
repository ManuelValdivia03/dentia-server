import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { RequestUser } from './interfaces/request-user.interface';

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);

  constructor(
    @Inject('PRESCRIPTIONS_SERVICE')
    private readonly client: ClientProxy,
  ) {}

  create(dto: CreatePrescriptionDto, requester: RequestUser) {
    return this.forward(
      this.client.send({ cmd: 'prescriptions.create' }, { dto, requester }),
      'prescriptions.create',
    );
  }

  findOne(id: string, requester: RequestUser) {
    return this.forward(
      this.client.send({ cmd: 'prescriptions.findOne' }, { id, requester }),
      'prescriptions.findOne',
    );
  }

  findByAppointment(appointmentId: string, requester: RequestUser) {
    return this.forward(
      this.client.send(
        { cmd: 'prescriptions.findByAppointment' },
        { appointmentId, requester },
      ),
      'prescriptions.findByAppointment',
    );
  }

  generatePdf(id: string, requester: RequestUser) {
    return this.forward(
      this.client.send({ cmd: 'prescriptions.generatePdf' }, { id, requester }),
      'prescriptions.generatePdf',
    );
  }

  private async forward(request: any, operation: string): Promise<any> {
    try {
      return await firstValueFrom(request);
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: 'service_call_failed',
          service: 'api-gateway',
          targetService: 'prescriptions-service',
          operation,
          reason: error instanceof Error ? error.message : 'unknown',
        }),
      );
      throw error;
    }
  }
}
