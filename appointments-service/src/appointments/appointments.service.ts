import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { EventsPublisher } from '../events/events.publisher';
import { RequestUser, RequestUserRole } from './interfaces/request-user.interface';
import { ReportsClientService } from '../reports/reports-client.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
    private readonly eventsPublisher: EventsPublisher,
    private readonly reportsClient: ReportsClientService,
  ) {}

  async findAll(requester: RequestUser) {
    const where =
      requester.role === RequestUserRole.ADMIN
        ? {}
        : requester.role === RequestUserRole.PATIENT
          ? { patientId: requester.domainId }
          : { dentistId: requester.domainId };

    return this.appointmentsRepository.find({
      where,
      order: { startAt: 'ASC' },
    });
  }

  async findOne(id: string, requester: RequestUser) {
    const appointment = await this.findByIdOrFail(id);
    this.ensureCanViewAppointment(appointment, requester);
    return appointment;
  }

  async getAvailability(dentistId: string, date: string, requester: RequestUser) {
    if (!dentistId || !date) {
      throw new BadRequestException('dentistId y date son obligatorios');
    }

    if (
      requester.role === RequestUserRole.DENTIST &&
      dentistId !== requester.domainId
    ) {
      throw new ForbiddenException(
        'No puedes consultar disponibilidad de otro dentista',
      );
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

  async create(dto: CreateAppointmentDto, requester: RequestUser) {
    if (
      requester.role === RequestUserRole.PATIENT &&
      dto.patientId !== requester.domainId
    ) {
      throw new ForbiddenException('No puedes crear citas para otro paciente');
    }

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

    const savedAppointment = await this.appointmentsRepository.save(appointment);

    await this.eventsPublisher.publishAppointmentCreated({
      appointmentId: savedAppointment.id,
      patientId: savedAppointment.patientId,
      dentistId: savedAppointment.dentistId,
      startAt: savedAppointment.startAt.toISOString(),
      endAt: savedAppointment.endAt.toISOString(),
      status: savedAppointment.status,
    });

    await this.syncAppointmentToReports(savedAppointment);

    return savedAppointment;
  }

  async reschedule(
    id: string,
    dto: RescheduleAppointmentDto,
    requester: RequestUser,
  ) {
    const appointment = await this.findByIdOrFail(id);
    this.ensurePatientOrAdminCanManage(appointment, requester);

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

    const savedAppointment = await this.appointmentsRepository.save(appointment);

    await this.syncAppointmentToReports(savedAppointment);

    return savedAppointment;
  }

  async cancel(id: string, requester: RequestUser) {
    const appointment = await this.findByIdOrFail(id);
    this.ensureCanCancelAppointment(appointment, requester);
    appointment.status = AppointmentStatus.CANCELLED;
    const savedAppointment = await this.appointmentsRepository.save(appointment);

    await this.syncAppointmentToReports(savedAppointment);

    return savedAppointment
  }

  async confirm(id: string, requester: RequestUser) {
    const appointment = await this.findByIdOrFail(id);
    this.ensureDentistOrAdminCanOperate(appointment, requester);

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('No se puede confirmar una cita cancelada');
    }

    appointment.status = AppointmentStatus.CONFIRMED;
    const savedAppointment = await this.appointmentsRepository.save(appointment);

    await this.syncAppointmentToReports(savedAppointment);

    return savedAppointment;
  }

  async complete(id: string, requester: RequestUser) {
    const appointment = await this.findByIdOrFail(id);
    this.ensureDentistOrAdminCanOperate(appointment, requester);

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('No se puede completar una cita cancelada');
    }

    appointment.status = AppointmentStatus.COMPLETED;
    const savedAppointment = await this.appointmentsRepository.save(appointment);

    await this.syncAppointmentToReports(savedAppointment);

    return savedAppointment;
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
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Fechas inválidas');
    }

    if (endAt <= startAt) {
      throw new BadRequestException('endAt debe ser mayor que startAt');
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

  private ensureCanViewAppointment(appointment: Appointment, requester: RequestUser) {
    if (requester.role === RequestUserRole.ADMIN) {
      return;
    }

    if (
      requester.role === RequestUserRole.PATIENT &&
      appointment.patientId !== requester.domainId
    ) {
      throw new ForbiddenException('No puedes ver citas de otro paciente');
    }

    if (
      requester.role === RequestUserRole.DENTIST &&
      appointment.dentistId !== requester.domainId
    ) {
      throw new ForbiddenException('No puedes ver citas de otro dentista');
    }
  }

  private ensurePatientOrAdminCanManage(
    appointment: Appointment,
    requester: RequestUser,
  ) {
    if (requester.role === RequestUserRole.ADMIN) {
      return;
    }

    if (
      requester.role === RequestUserRole.PATIENT &&
      appointment.patientId === requester.domainId
    ) {
      return;
    }

    throw new ForbiddenException('No puedes reprogramar esta cita');
  }

  private ensureCanCancelAppointment(
    appointment: Appointment,
    requester: RequestUser,
  ) {
    if (requester.role === RequestUserRole.ADMIN) {
      return;
    }

    if (
      requester.role === RequestUserRole.PATIENT &&
      appointment.patientId === requester.domainId
    ) {
      return;
    }

    if (
      requester.role === RequestUserRole.DENTIST &&
      appointment.dentistId === requester.domainId
    ) {
      return;
    }

    throw new ForbiddenException('No puedes cancelar esta cita');
  }

  private ensureDentistOrAdminCanOperate(
    appointment: Appointment,
    requester: RequestUser,
  ) {
    if (requester.role === RequestUserRole.ADMIN) {
      return;
    }

    if (
      requester.role === RequestUserRole.DENTIST &&
      appointment.dentistId === requester.domainId
    ) {
      return;
    }

    throw new ForbiddenException('No tienes permisos para operar esta cita');
  }

  private async syncAppointmentToReports(appointment: Appointment): Promise<void> {
    await this.reportsClient.sendAppointmentSnapshot({
      appointment_id: appointment.id,
      doctor_id: appointment.dentistId,
      patient_id: appointment.patientId,
      status: this.mapStatusToReportStatus(appointment.status),
      scheduled_at: appointment.startAt.toISOString(),
      duration_minutes: this.calculateDurationMinutes(
        appointment.startAt,
        appointment.endAt,
      ),
    });
  }

  private mapStatusToReportStatus(status: AppointmentStatus): string {
    switch (status) {
      case AppointmentStatus.PENDING:
        return 'scheduled';

      case AppointmentStatus.CONFIRMED:
        return 'confirmed';

      case AppointmentStatus.COMPLETED:
        return 'completed';

      case AppointmentStatus.CANCELLED:
        return 'cancelled';

      default:
        return 'scheduled';
    }
  }

  private calculateDurationMinutes(startAt: Date, endAt: Date): number {
    const durationMs = endAt.getTime() - startAt.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    return durationMinutes > 0 ? durationMinutes : 60;
  }
}