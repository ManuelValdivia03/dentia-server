import {
  Controller,
  Get,
  Param,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Dentist Ratings')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dentists')
export class DentistRatingsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get(':dentistId/ratings/summary')
  @Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
  @ApiOperation({ summary: 'Obtener resumen de valoraciones de un dentista' })
  @ApiParam({ name: 'dentistId', example: 'dentist_123' })
  @ApiOkResponse({ description: 'Resumen de valoraciones.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol sin permisos suficientes.' })
  @ApiNotFoundResponse({ description: 'Dentista no encontrado.' })
  @ApiServiceUnavailableResponse({ description: 'appointments-service no disponible.' })
  getDentistRatingsSummary(
    @Param('dentistId') dentistId: string,
    @Req() req: Request,
  ) {
    return this.appointmentsService.getDentistRatingsSummary(
      dentistId,
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
