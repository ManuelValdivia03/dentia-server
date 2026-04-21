import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@Controller()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @MessagePattern({ cmd: 'appointments.findAll' })
  findAll() {
    return this.appointmentsService.findAll();
  }

  @MessagePattern({ cmd: 'appointments.findOne' })
  findOne(@Payload('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @MessagePattern({ cmd: 'appointments.availability' })
  getAvailability(
    @Payload() payload: { dentistId: string; date: string },
  ) {
    return this.appointmentsService.getAvailability(
      payload.dentistId,
      payload.date,
    );
  }

  @MessagePattern({ cmd: 'appointments.create' })
  create(@Payload() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  @MessagePattern({ cmd: 'appointments.reschedule' })
  reschedule(
    @Payload() payload: { id: string; dto: RescheduleAppointmentDto },
  ) {
    return this.appointmentsService.reschedule(payload.id, payload.dto);
  }

  @MessagePattern({ cmd: 'appointments.cancel' })
  cancel(@Payload('id') id: string) {
    return this.appointmentsService.cancel(id);
  }

  @MessagePattern({ cmd: 'appointments.confirm' })
  confirm(@Payload('id') id: string) {
    return this.appointmentsService.confirm(id);
  }

  @MessagePattern({ cmd: 'appointments.complete' })
  complete(@Payload('id') id: string) {
    return this.appointmentsService.complete(id);
  }
}