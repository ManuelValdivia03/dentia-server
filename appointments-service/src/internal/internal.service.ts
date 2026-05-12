import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentStatus } from '../appointments/enums/appointment-status.enum';

@Injectable()
export class InternalService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
  ) {}

  async hasPatientDentistRelation(patientId: string, dentistId: string) {
    const appointment = await this.appointmentRepository.findOne({
      where: {
        patientId,
        dentistId,
        status: In([
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.COMPLETED,
        ]),
      },
    });

    return {
      allowed: !!appointment,
    };
  }
}