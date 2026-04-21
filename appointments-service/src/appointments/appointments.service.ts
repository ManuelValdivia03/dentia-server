import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
  ) {}

  async findAll() {
    return this.appointmentsRepository.find({
      order: { startAt: 'ASC' },
    });
  }

  async findOne(id: string) {
    return this.findByIdOrFail(id);
  }

  async getAvailability(dentistId: string, date: string) {
    if (!dentistId || !date) {
      throw new BadRequestException('dentistId y date son obligatorios');
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    if (Number.isNaN(dayStart.getTime()) || Number.isNaN(dayEnd.getTime())) {
      throw new BadRequestException('date debe tener formato YYYY-MM-DD');
    }

    const appointments = await this.appointmentsRepository
      .createQueryBuilder('appointment')
      .where('appointment.dentistId = :dentistId', { dentistId })
      .andWhere('appointment.status != :cancelled', {
        cancelled: AppointmentStatus.CANCELLED,
      })
      .andWhere('appointment.startAt <= :dayEnd', { dayEnd })
      .andWhere('appointment.endAt >= :dayStart', { dayStart })
      .orderBy('appointment.startAt', 'ASC')
      .getMany();

    const slots: { startAt: Date; endAt: Date; available: boolean }[] = [];
    for (let hour = 9; hour < 17; hour++) {
      const startAt = new Date(
        `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`,
      );
      const endAt = new Date(
        `${date}T${String(hour + 1).padStart(2, '0')}:00:00.000Z`,
      );

      const occupied = appointments.some(
        (appointment) =>
          appointment.startAt < endAt && appointment.endAt > startAt,
      );

      slots.push({
        startAt,
        endAt,
        available: !occupied,
      });
    }

    return {
      dentistId,
      date,
      slots,
    };
  }

  async create(dto: CreateAppointmentDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    this.validateRange(startAt, endAt);

    await this.ensureNoOverlap(dto.dentistId, startAt, endAt);

    const appointment = this.appointmentsRepository.create({
      patientId: dto.patientId,
      dentistId: dto.dentistId,
      startAt,
      endAt,
      reason: dto.reason,
      notes: dto.notes,
      status: AppointmentStatus.PENDING,
    });

    return this.appointmentsRepository.save(appointment);
  }

  async reschedule(id: string, dto: RescheduleAppointmentDto) {
    const appointment = await this.findByIdOrFail(id);

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    this.validateRange(startAt, endAt);

    await this.ensureNoOverlap(
      appointment.dentistId,
      startAt,
      endAt,
      appointment.id,
    );

    appointment.startAt = startAt;
    appointment.endAt = endAt;
    appointment.status = AppointmentStatus.PENDING;

    return this.appointmentsRepository.save(appointment);
  }

  async cancel(id: string) {
    const appointment = await this.findByIdOrFail(id);
    appointment.status = AppointmentStatus.CANCELLED;
    return this.appointmentsRepository.save(appointment);
  }

  async confirm(id: string) {
    const appointment = await this.findByIdOrFail(id);

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('No se puede confirmar una cita cancelada');
    }

    appointment.status = AppointmentStatus.CONFIRMED;
    return this.appointmentsRepository.save(appointment);
  }

  async complete(id: string) {
    const appointment = await this.findByIdOrFail(id);

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('No se puede completar una cita cancelada');
    }

    appointment.status = AppointmentStatus.COMPLETED;
    return this.appointmentsRepository.save(appointment);
  }

  private async findByIdOrFail(id: string) {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    return appointment;
  }

  private validateRange(startAt: Date, endAt: Date) {
    if (
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime())
    ) {
      throw new BadRequestException('Fechas inválidas');
    }

    if (endAt <= startAt) {
      throw new BadRequestException(
        'endAt debe ser mayor que startAt',
      );
    }
  }

  private async ensureNoOverlap(
    dentistId: string,
    startAt: Date,
    endAt: Date,
    excludeId?: string,
  ) {
    const query = this.appointmentsRepository
      .createQueryBuilder('appointment')
      .where('appointment.dentistId = :dentistId', { dentistId })
      .andWhere('appointment.status != :cancelled', {
        cancelled: AppointmentStatus.CANCELLED,
      })
      .andWhere('appointment.startAt < :endAt', { endAt })
      .andWhere('appointment.endAt > :startAt', { startAt });

    if (excludeId) {
      query.andWhere('appointment.id != :excludeId', { excludeId });
    }

    const overlapping = await query.getOne();

    if (overlapping) {
      throw new BadRequestException(
        'El dentista ya tiene una cita en ese horario',
      );
    }
  }
}