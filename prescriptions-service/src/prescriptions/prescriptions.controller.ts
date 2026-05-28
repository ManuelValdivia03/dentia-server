import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { RequestUser } from './interfaces/request-user.interface';

@Controller()
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @MessagePattern({ cmd: 'prescriptions.create' })
  create(
    @Payload()
    payload: { dto: CreatePrescriptionDto; requester: RequestUser },
  ) {
    return this.prescriptionsService.create(payload.dto, payload.requester);
  }

  @MessagePattern({ cmd: 'prescriptions.findOne' })
  findOne(
    @Payload()
    payload: { id: string; requester: RequestUser },
  ) {
    return this.prescriptionsService.findOne(payload.id, payload.requester);
  }

  @MessagePattern({ cmd: 'prescriptions.findByAppointment' })
  findByAppointment(
    @Payload()
    payload: { appointmentId: string; requester: RequestUser },
  ) {
    return this.prescriptionsService.findByAppointment(
      payload.appointmentId,
      payload.requester,
    );
  }

  @MessagePattern({ cmd: 'prescriptions.generatePdf' })
  generatePdf(
    @Payload()
    payload: { id: string; requester: RequestUser },
  ) {
    return this.prescriptionsService.generatePdf(payload.id, payload.requester);
  }
}