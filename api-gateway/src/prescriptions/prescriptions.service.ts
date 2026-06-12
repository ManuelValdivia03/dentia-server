import {
  HttpException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
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

  create(dto: CreatePrescriptionDto, requester: RequestUser, authHeader: string) {
    return this.forward(
      this.client.send(
        { cmd: 'prescriptions.create' },
        { dto, requester, authHeader },
      ),
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

  generatePdf(id: string, requester: RequestUser, authHeader: string) {
    return this.forward(
      this.client.send(
        { cmd: 'prescriptions.generatePdf' },
        { id, requester, authHeader },
      ),
      'prescriptions.generatePdf',
    )
  }

  private async forward(request: any, operation: string): Promise<any> {
    try {
      return await firstValueFrom(request);
    } catch (error: any) {
      const rpcPayload =
        typeof error?.message === 'object' && error.message !== null
          ? error.message
          : error?.response;

      const possibleStatus =
        rpcPayload?.statusCode ??
        error?.statusCode ??
        error?.response?.statusCode;

      const status = typeof possibleStatus === 'number' ? possibleStatus : 503;

      const message =
        rpcPayload?.message ??
        error?.response?.message ??
        error?.message ??
        error?.error ??
        'prescriptions-service is unavailable';

      this.logger.warn(
        JSON.stringify({
          event: 'service_call_failed',
          service: 'api-gateway',
          targetService: 'prescriptions-service',
          operation,
          status,
          message,
        }),
      );

      throw new HttpException(message, status);
    }
  }
}