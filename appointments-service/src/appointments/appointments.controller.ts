import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { RequestUser } from './interfaces/request-user.interface';

@Controller()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @MessagePattern({ cmd: 'appointments.findAll' })
  findAll(@Payload() payload: { requester: RequestUser }) {
    return this.appointmentsService.findAll(payload.requester);
  }

  @MessagePattern({ cmd: 'appointments.findOne' })
  findOne(@Payload() payload: { id: string; requester: RequestUser }) {
    return this.appointmentsService.findOne(payload.id, payload.requester);
  }

  @MessagePattern({ cmd: 'appointments.availability' })
  getAvailability(
    @Payload() payload: { dentistId: string; date: string; requester: RequestUser },
  ) {
    return this.appointmentsService.getAvailability(
      payload.dentistId,
      payload.date,
      payload.requester,
    );
  }

  @MessagePattern({ cmd: 'appointments.create' })
  create(@Payload() payload: { dto: CreateAppointmentDto; requester: RequestUser }) {
    return this.appointmentsService.create(payload.dto, payload.requester);
  }

  @MessagePattern({ cmd: 'appointments.reschedule' })
  reschedule(
    @Payload() payload: { id: string; dto: RescheduleAppointmentDto; requester: RequestUser },
  ) {
    return this.appointmentsService.reschedule(payload.id, payload.dto, payload.requester);
  }

  @MessagePattern({ cmd: 'appointments.cancel' })
  cancel(@Payload() payload: { id: string; requester: RequestUser }) {
    return this.appointmentsService.cancel(payload.id, payload.requester);
  }

  @MessagePattern({ cmd: 'appointments.confirm' })
  confirm(@Payload() payload: { id: string; requester: RequestUser }) {
    return this.appointmentsService.confirm(payload.id, payload.requester);
  }

  @MessagePattern({ cmd: 'appointments.complete' })
  complete(@Payload() payload: { id: string; requester: RequestUser }) {
    return this.appointmentsService.complete(payload.id, payload.requester);
  }
}
