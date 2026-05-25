import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { RequestUser } from './interfaces/request-user.interface';

type AuthenticatedRequest = Request & {
  user: RequestUser;
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
  findAll(@Req() req: AuthenticatedRequest) {
    return this.appointmentsService.findAll(this.getAuthHeader(req));
  }

  @Get('availability')
  @Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
  getAvailability(
    @Query('dentistId') dentistId: string,
    @Query('date') date: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.appointmentsService.getAvailability(
      dentistId,
      date,
      this.getAuthHeader(req),
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.appointmentsService.findOne(id, this.getAuthHeader(req));
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PATIENT)
  create(@Body() dto: CreateAppointmentDto, @Req() req: AuthenticatedRequest) {
    if (req.user.role === UserRole.PATIENT) {
      dto.patientId = req.user.domainId;
    }

    return this.appointmentsService.create(dto, this.getAuthHeader(req));
  }

  @Patch(':id/reschedule')
  @Roles(UserRole.ADMIN, UserRole.PATIENT)
  reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.appointmentsService.reschedule(
      id,
      dto,
      this.getAuthHeader(req),
    );
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
  cancel(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.appointmentsService.cancel(id, this.getAuthHeader(req));
  }

  @Patch(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  confirm(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.appointmentsService.confirm(id, this.getAuthHeader(req));
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  complete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.appointmentsService.complete(id, this.getAuthHeader(req));
  }

  private getAuthHeader(req: Request): string {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    return authHeader;
  }
}