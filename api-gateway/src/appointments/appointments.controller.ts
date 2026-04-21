import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    role: UserRole;
    domainId: string;
    email: string;
  };
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
  async findAll(@Req() req: AuthenticatedRequest) {
    const appointments = await this.appointmentsService.findAll();
    return this.filterAppointmentsByRole(appointments, req.user);
  }

  @Get('availability')
  @Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
  getAvailability(
    @Query('dentistId') dentistId: string,
    @Query('date') date: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (
      req.user.role === UserRole.DENTIST &&
      dentistId !== req.user.domainId
    ) {
      throw new ForbiddenException(
        'No puedes consultar disponibilidad de otro dentista',
      );
    }

    return this.appointmentsService.getAvailability(dentistId, date);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const appointment = await this.appointmentsService.findOne(id);
    this.ensureCanViewAppointment(appointment, req.user);
    return appointment;
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PATIENT)
  create(@Body() dto: CreateAppointmentDto, @Req() req: AuthenticatedRequest) {
    if (req.user.role === UserRole.PATIENT) {
      dto.patientId = req.user.domainId;
    }

    return this.appointmentsService.create(dto);
  }

  @Patch(':id/reschedule')
  @Roles(UserRole.ADMIN, UserRole.PATIENT)
  async reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const appointment = await this.appointmentsService.findOne(id);
    this.ensurePatientOrAdminCanManage(appointment, req.user);

    return this.appointmentsService.reschedule(id, dto);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
  async cancel(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const appointment = await this.appointmentsService.findOne(id);
    this.ensureCanCancelAppointment(appointment, req.user);

    return this.appointmentsService.cancel(id);
  }

  @Patch(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  async confirm(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const appointment = await this.appointmentsService.findOne(id);
    this.ensureDentistOrAdminCanOperate(appointment, req.user);

    return this.appointmentsService.confirm(id);
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  async complete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const appointment = await this.appointmentsService.findOne(id);
    this.ensureDentistOrAdminCanOperate(appointment, req.user);

    return this.appointmentsService.complete(id);
  }

  private filterAppointmentsByRole(appointments: any[], user: AuthenticatedRequest['user']) {
    if (user.role === UserRole.ADMIN) {
      return appointments;
    }

    if (user.role === UserRole.PATIENT) {
      return appointments.filter(
        (appointment) => appointment.patientId === user.domainId,
      );
    }

    if (user.role === UserRole.DENTIST) {
      return appointments.filter(
        (appointment) => appointment.dentistId === user.domainId,
      );
    }

    return [];
  }

  private ensureCanViewAppointment(
    appointment: any,
    user: AuthenticatedRequest['user'],
  ) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (
      user.role === UserRole.PATIENT &&
      appointment.patientId !== user.domainId
    ) {
      throw new ForbiddenException('No puedes ver citas de otro paciente');
    }

    if (
      user.role === UserRole.DENTIST &&
      appointment.dentistId !== user.domainId
    ) {
      throw new ForbiddenException('No puedes ver citas de otro dentista');
    }
  }

  private ensurePatientOrAdminCanManage(
    appointment: any,
    user: AuthenticatedRequest['user'],
  ) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (
      user.role === UserRole.PATIENT &&
      appointment.patientId === user.domainId
    ) {
      return;
    }

    throw new ForbiddenException('No puedes reprogramar esta cita');
  }

  private ensureCanCancelAppointment(
    appointment: any,
    user: AuthenticatedRequest['user'],
  ) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (
      user.role === UserRole.PATIENT &&
      appointment.patientId === user.domainId
    ) {
      return;
    }

    if (
      user.role === UserRole.DENTIST &&
      appointment.dentistId === user.domainId
    ) {
      return;
    }

    throw new ForbiddenException('No puedes cancelar esta cita');
  }

  private ensureDentistOrAdminCanOperate(
    appointment: any,
    user: AuthenticatedRequest['user'],
  ) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (
      user.role === UserRole.DENTIST &&
      appointment.dentistId === user.domainId
    ) {
      return;
    }

    throw new ForbiddenException(
      'No tienes permisos para operar esta cita',
    );
  }
}