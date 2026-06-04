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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { RequestUser } from './interfaces/request-user.interface';

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
  @ApiOperation({ summary: 'Listar citas según rol autenticado' })
  @ApiOkResponse({ description: 'Listado de citas.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol sin permisos suficientes.' })
  @ApiServiceUnavailableResponse({ description: 'appointments-service no disponible.' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.appointmentsService.findAll(this.getAuthHeader(req));
  }

  @Get('availability')
  @Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
  @ApiOperation({ summary: 'Consultar disponibilidad de un dentista' })
  @ApiQuery({ name: 'dentistId', required: true, example: 'dentist_123' })
  @ApiQuery({ name: 'date', required: true, example: '2026-06-01' })
  @ApiOkResponse({ description: 'Disponibilidad encontrada.' })
  @ApiBadRequestResponse({ description: 'Parámetros inválidos.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol sin permisos suficientes.' })
  @ApiServiceUnavailableResponse({ description: 'appointments-service no disponible.' })
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

  @Get('day')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @ApiOperation({ summary: 'Consultar agenda de citas por día' })
  @ApiQuery({ name: 'date', required: true, example: '2026-06-01' })
  @ApiQuery({
    name: 'dentistId',
    required: false,
    example: 'd-123',
    description: 'Solo aplica para ADMIN. DENTIST siempre usa su propio domainId.',
  })
  @ApiOkResponse({ description: 'Agenda diaria encontrada.' })
  @ApiBadRequestResponse({ description: 'Fecha inválida.' }) 
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol sin permisos suficientes.' })
  @ApiServiceUnavailableResponse({ description: 'appointments-service no disponible.' })
  findByDay(
    @Query('date') date: string,
    @Query('dentistId') dentistId: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.appointmentsService.findByDay(
      date,
      dentistId,
      this.getAuthHeader(req),
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
  @ApiOperation({ summary: 'Consultar cita por ID' })
  @ApiParam({ name: 'id', example: 'appointment_123' })
  @ApiOkResponse({ description: 'Detalle de cita.' })
  @ApiNotFoundResponse({ description: 'Cita no encontrada.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No tiene permiso para consultar esta cita.' })
  @ApiServiceUnavailableResponse({ description: 'appointments-service no disponible.' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.appointmentsService.findOne(id, this.getAuthHeader(req));
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PATIENT)
  @ApiOperation({ summary: 'Crear cita' })
  @ApiBody({ type: CreateAppointmentDto })
  @ApiCreatedResponse({ description: 'Cita creada correctamente.' })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol sin permisos suficientes.' })
  @ApiConflictResponse({ description: 'Horario no disponible o empalme detectado.' })
  @ApiServiceUnavailableResponse({ description: 'appointments-service no disponible.' })
  create(@Body() dto: CreateAppointmentDto, @Req() req: AuthenticatedRequest) {
    if (req.user.role === UserRole.PATIENT) {
      dto.patientId = req.user.domainId;
    }

    return this.appointmentsService.create(dto, this.getAuthHeader(req));
  }

  @Patch(':id/reschedule')
  @Roles(UserRole.ADMIN, UserRole.PATIENT)
  @ApiOperation({ summary: 'Reprogramar cita' })
  @ApiParam({ name: 'id', example: 'appointment_123' })
  @ApiBody({ type: RescheduleAppointmentDto })
  @ApiOkResponse({ description: 'Cita reprogramada correctamente.' })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No tiene permiso para reprogramar esta cita.' })
  @ApiNotFoundResponse({ description: 'Cita no encontrada.' })
  @ApiConflictResponse({ description: 'Nuevo horario no disponible.' })
  @ApiServiceUnavailableResponse({ description: 'appointments-service no disponible.' })
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
  @ApiOperation({ summary: 'Cancelar cita' })
  @ApiParam({ name: 'id', example: 'appointment_123' })
  @ApiOkResponse({ description: 'Cita cancelada correctamente.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No tiene permiso para cancelar esta cita.' })
  @ApiNotFoundResponse({ description: 'Cita no encontrada.' })
  @ApiServiceUnavailableResponse({ description: 'appointments-service no disponible.' })
  cancel(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.appointmentsService.cancel(id, this.getAuthHeader(req));
  }

  @Patch(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @ApiOperation({ summary: 'Confirmar cita' })
  @ApiParam({ name: 'id', example: 'appointment_123' })
  @ApiOkResponse({ description: 'Cita confirmada correctamente.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Solo administrador o dentista pueden confirmar citas.' })
  @ApiNotFoundResponse({ description: 'Cita no encontrada.' })
  @ApiServiceUnavailableResponse({ description: 'appointments-service no disponible.' })
  confirm(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.appointmentsService.confirm(id, this.getAuthHeader(req));
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @ApiOperation({ summary: 'Marcar cita como atendida' })
  @ApiParam({ name: 'id', example: 'appointment_123' })
  @ApiOkResponse({ description: 'Cita marcada como atendida.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Solo administrador o dentista pueden atender citas.' })
  @ApiNotFoundResponse({ description: 'Cita no encontrada.' })
  @ApiServiceUnavailableResponse({ description: 'appointments-service no disponible.' })
  complete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.appointmentsService.complete(id, this.getAuthHeader(req));
  }

  @Post(':id/rating')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Calificar atención de una cita' })
  @ApiParam({ name: 'id', example: 'appointment_123' })
  @ApiBody({ type: CreateRatingDto })
  @ApiCreatedResponse({ description: 'Valoración registrada correctamente.' })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Solo el paciente de la cita puede calificar.' })
  @ApiNotFoundResponse({ description: 'Cita no encontrada.' })
  @ApiServiceUnavailableResponse({ description: 'appointments-service no disponible.' })
  createRating(
    @Param('id') id: string,
    @Body() dto: CreateRatingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.appointmentsService.createRating(
      id,
      dto,
      this.getAuthHeader(req),
    );
  }

  private getAuthHeader(req: Request): string {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    return authHeader;
  }
}
