import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { RequestUser } from './interfaces/request-user.interface';
import { PrescriptionsService } from './prescriptions.service';
import { UpdateClinicalRecordDto } from './dto/update-clinical-record.dto';
import { CreateClinicalEncounterDto } from './dto/create-clinical-encounter.dto';

type AuthenticatedRequest = Request & {
  user: RequestUser;
};

@ApiTags('Clinical Records')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clinical-records')
export class ClinicalRecordsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get('me')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Consultar mi expediente clínico como paciente' })
  @ApiQuery({
    name: 'dentistId',
    required: false,
    example: 'd-b11b1014-5be6-4457-a9a5-a64892ea64e3',
  })
  @ApiOkResponse({ description: 'Expediente clínico del paciente autenticado.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Solo pacientes pueden consultar esta vista.' })
  @ApiServiceUnavailableResponse({ description: 'prescriptions-service no disponible.' })
  findMine(
    @Query('dentistId') dentistId: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.prescriptionsService.findClinicalRecordByPatient(
      req.user.domainId,
      req.user,
      this.getAuthHeader(req),
      dentistId,
    );
  }

  @Get('patients/:patientId')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @ApiOperation({ summary: 'Consultar expediente clínico de un paciente' })
  @ApiParam({ name: 'patientId', example: 'p-cdb813f2-b5a9-47c8-ad33-49481a5ecbc7' })
  @ApiQuery({
    name: 'dentistId',
    required: false,
    example: 'd-b11b1014-5be6-4457-a9a5-a64892ea64e3',
  })
  @ApiOkResponse({ description: 'Expediente clínico encontrado.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'El dentista no tiene relación clínica con este paciente.' })
  @ApiServiceUnavailableResponse({ description: 'prescriptions-service no disponible.' })
  findByPatient(
    @Param('patientId') patientId: string,
    @Query('dentistId') dentistId: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.prescriptionsService.findClinicalRecordByPatient(
      patientId,
      req.user,
      this.getAuthHeader(req),
      dentistId,
    );
  }

  @Patch('patients/:patientId')
  @Roles(UserRole.DENTIST)
  @ApiOperation({ summary: 'Actualizar antecedentes del expediente clínico' })
  @ApiParam({ name: 'patientId', example: 'p-cdb813f2-b5a9-47c8-ad33-49481a5ecbc7' })
  @ApiBody({ type: UpdateClinicalRecordDto })
  @ApiOkResponse({ description: 'Expediente clínico actualizado.' })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'El dentista no tiene relación clínica con este paciente.' })
  @ApiServiceUnavailableResponse({ description: 'prescriptions-service no disponible.' })
  updatePatientRecord(
    @Param('patientId') patientId: string,
    @Body() dto: UpdateClinicalRecordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.prescriptionsService.updateClinicalRecord(
      patientId,
      dto,
      req.user,
      this.getAuthHeader(req),
    );
  }

  @Post('patients/:patientId/encounters')
  @Roles(UserRole.DENTIST)
  @ApiOperation({ summary: 'Registrar consulta clínica en el expediente' })
  @ApiParam({ name: 'patientId', example: 'p-cdb813f2-b5a9-47c8-ad33-49481a5ecbc7' })
  @ApiBody({ type: CreateClinicalEncounterDto })
  @ApiCreatedResponse({ description: 'Consulta clínica registrada.' })
  @ApiBadRequestResponse({ description: 'Datos inválidos o cita duplicada.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'La cita no pertenece al dentista autenticado.' })
  @ApiServiceUnavailableResponse({ description: 'prescriptions-service no disponible.' })
  createEncounter(
    @Param('patientId') patientId: string,
    @Body() dto: CreateClinicalEncounterDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.prescriptionsService.createClinicalEncounter(
      patientId,
      dto,
      req.user,
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