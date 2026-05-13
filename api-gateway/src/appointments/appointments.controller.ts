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
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';

type AuthenticatedRequest = Request & {
  user: RequestUser;
};

@ApiTags('Appointments')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
  @ApiOperation({ summary: 'Listar citas según el rol del usuario autenticado' })
  @ApiOkResponse({ description: 'Listado de citas.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.appointmentsService.findAll(req.user);
  }

  @Get('availability')
  @Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
  @ApiOperation({ summary: 'Consultar disponibilidad de un dentista por fecha' })
  @ApiOkResponse({ description: 'Disponibilidad calculada.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  getAvailability(
    @Query('dentistId') dentistId: string,
    @Query('date') date: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.appointmentsService.getAvailability(dentistId, date, req.user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
  @ApiOperation({ summary: 'Consultar una cita por ID' })
  @ApiOkResponse({ description: 'Detalle de la cita.' })
  @ApiNotFoundResponse({ description: 'Cita no encontrada.' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.appointmentsService.findOne(id, req.user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PATIENT)
  @ApiOperation({ summary: 'Crear una nueva cita odontológica' })
  @ApiCreatedResponse({ description: 'Cita creada correctamente.' })
  @ApiConflictResponse({ description: 'Horario no disponible o empalme detectado.' })
  @ApiForbiddenResponse({ description: 'Rol sin permiso para crear cita.' })
  create(@Body() dto: CreateAppointmentDto, @Req() req: AuthenticatedRequest) {
    if (req.user.role === UserRole.PATIENT) {
      dto.patientId = req.user.domainId;
    }

    return this.appointmentsService.create(dto, req.user);
  }

  @Patch(':id/reschedule')
  @Roles(UserRole.ADMIN, UserRole.PATIENT)
  @ApiOperation({summary: 'Cambiar fecha y hora de una cita'})
  @ApiOkResponse({description: "Cita reagendada correctamente"})
  @ApiConflictResponse({ description: 'El nuevo horario no está disponible o genera empalme.' })
  @ApiForbiddenResponse({ description: 'No tiene permiso para reagendar esta cita.' })
  @ApiNotFoundResponse({ description: 'Cita no encontrada.' })
  reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.appointmentsService.reschedule(id, dto, req.user);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
  @ApiOperation({ summary: 'Cancelar una cita' })
  @ApiOkResponse({ description: 'Cita cancelada correctamente.' })
  @ApiForbiddenResponse({ description: 'No tiene permiso para cancelar esta cita.' })
  cancel(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.appointmentsService.cancel(id, req.user);
  }

  @Patch(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @ApiOperation({ summary: 'Confirmar una cita como dentista o administrador' })
  @ApiOkResponse({ description: 'Cita confirmada correctamente.' })
  @ApiForbiddenResponse({ description: 'Rol sin permiso para confirmar cita.' })
  confirm(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.appointmentsService.confirm(id, req.user);
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @ApiOperation({summary: 'Marcar como completada una cita'})
  @ApiOkResponse({description: 'Cita completada correctamente'})
  @ApiForbiddenResponse({ description: 'No tiene permiso para completar esta cita.' })
  @ApiNotFoundResponse({ description: 'Cita no encontrada.' })
  complete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.appointmentsService.complete(id, req.user);
  }
}
