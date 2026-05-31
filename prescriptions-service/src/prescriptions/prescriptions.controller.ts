import {
  Controller,
  Get,
  Post,
  Req,
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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { RequestUser } from './interfaces/request-user.interface';
import { Request } from 'express';

type AuthenticatedRequest = Request & {
  user: RequestUser;
};

@ApiTags('Prescriptions')
@ApiBearerAuth('JWT')
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar recetas' })
  @ApiOkResponse({ description: 'Listado de recetas obtenido correctamente' })
  @ApiUnauthorizedResponse({ description: 'JWT requerido o inválido' })
  @ApiForbiddenResponse({ description: 'Rol sin permisos' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.prescriptionsService.findAll(req.user);
  }

  @Post()
  @ApiOperation({ summary: 'Crear receta' })
  @ApiBody({ type: CreatePrescriptionDto })
  @ApiCreatedResponse({ description: 'Receta creada correctamente' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiUnauthorizedResponse({ description: 'JWT requerido o inválido' })
  @ApiForbiddenResponse({ description: 'Rol sin permisos' })
  @ApiNotFoundResponse({ description: 'Cita asociada no encontrada' })
  @MessagePattern({ cmd: 'prescriptions.create' })
  create(
    @Payload()
    payload: { dto: CreatePrescriptionDto; requester: RequestUser },
  ) {
    return this.prescriptionsService.create(payload.dto, payload.requester);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar receta por ID' })
  @ApiParam({ name: 'id', example: 'prescription_123' })
  @ApiOkResponse({ description: 'Receta encontrada' })
  @ApiUnauthorizedResponse({ description: 'JWT requerido o inválido' })
  @ApiForbiddenResponse({ description: 'Sin permiso para consultar esta receta' })
  @ApiNotFoundResponse({ description: 'Receta no encontrada' })
  @MessagePattern({ cmd: 'prescriptions.findOne' })
  findOne(
    @Payload()
    payload: { id: string; requester: RequestUser },
  ) {
    return this.prescriptionsService.findOne(payload.id, payload.requester);
  }

  @Get('appointment/:appointmentId')
  @ApiOperation({ summary: 'Consultar recetas por cita' })
  @ApiParam({ name: 'appointmentId', example: 'appointment_123' })
  @ApiOkResponse({ description: 'Recetas asociadas a la cita' })
  @ApiUnauthorizedResponse({ description: 'JWT requerido o inválido' })
  @ApiForbiddenResponse({ description: 'Sin permiso para consultar esta cita' })
  @MessagePattern({ cmd: 'prescriptions.findByAppointment' })
  findByAppointment(
    @Payload()
    payload: { appointmentId: string; requester: RequestUser },
  ) {
    return this.prescriptionsService.findByAppointment(
      payload.appointmentId,
      payload.requester,
    );
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Generar PDF de receta' })
  @ApiParam({ name: 'id', example: 'prescription_123' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'PDF generado correctamente' })
  @ApiUnauthorizedResponse({ description: 'JWT requerido o inválido' })
  @ApiForbiddenResponse({ description: 'Sin permiso para descargar esta receta' })
  @ApiNotFoundResponse({ description: 'Receta no encontrada' })
  @MessagePattern({ cmd: 'prescriptions.generatePdf' })
  generatePdf(
    @Payload()
    payload: { id: string; requester: RequestUser },
  ) {
    return this.prescriptionsService.generatePdf(payload.id, payload.requester);
  }
}