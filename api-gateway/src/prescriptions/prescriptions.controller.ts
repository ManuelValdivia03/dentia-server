import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { RequestUser } from './interfaces/request-user.interface';
import { PrescriptionsService } from './prescriptions.service';

type AuthenticatedRequest = Request & {
  user: RequestUser;
};

@ApiTags('Prescriptions')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post('prescriptions')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @ApiOperation({ summary: 'Crear receta asociada a una cita' })
  @ApiBody({ type: CreatePrescriptionDto })
  @ApiCreatedResponse({ description: 'Receta creada correctamente.' })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  @ApiForbiddenResponse({ description: 'Solo administrador o dentista pueden crear recetas.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiServiceUnavailableResponse({ description: 'prescriptions-service no disponible.' })
  create(
    @Body() dto: CreatePrescriptionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.prescriptionsService.create(dto, req.user);
  }

  @Get('prescriptions/:id')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.PATIENT)
  @ApiOperation({ summary: 'Consultar receta por ID' })
  @ApiParam({
    name: 'id',
    example: 'prescription_123',
    description: 'ID de la receta.',
  })
  @ApiOkResponse({ description: 'Detalle de receta.' })
  @ApiNotFoundResponse({ description: 'Receta no encontrada.' })
  @ApiForbiddenResponse({ description: 'No tiene permiso para consultar esta receta.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiServiceUnavailableResponse({ description: 'prescriptions-service no disponible.' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.prescriptionsService.findOne(id, req.user);
  }

  @Get('prescriptions/:id/pdf')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.PATIENT)
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Generar PDF de receta' })
  @ApiParam({ name: 'id', example: 'prescription_123' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'PDF de receta generado correctamente.' })
  @ApiNotFoundResponse({ description: 'Receta no encontrada.' })
  @ApiForbiddenResponse({ description: 'No tiene permiso para descargar esta receta.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiServiceUnavailableResponse({ description: 'prescriptions-service no disponible.' })
  async generatePdf(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.prescriptionsService.generatePdf(id, req.user);

    return new StreamableFile(Buffer.from(result.base64, 'base64'), {
      disposition: `attachment; filename="${result.filename}"`,
      type: result.contentType,
    });
  }

  @Get('appointments/:appointmentId/prescriptions')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.PATIENT)
  @ApiOperation({ summary: 'Listar recetas asociadas a una cita' })
  @ApiParam({
    name: 'appointmentId',
    example: 'appointment_123',
    description: 'ID de la cita.',
  })
  @ApiOkResponse({ description: 'Listado de recetas asociadas a la cita.' })
  @ApiNotFoundResponse({ description: 'Cita o recetas no encontradas.' })
  @ApiForbiddenResponse({ description: 'No tiene permiso para consultar recetas de esta cita.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiServiceUnavailableResponse({ description: 'prescriptions-service no disponible.' })
  findByAppointment(
    @Param('appointmentId') appointmentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.prescriptionsService.findByAppointment(
      appointmentId,
      req.user,
    );
  }
}
