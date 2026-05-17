import {
  Controller,
  Get,
  Headers,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ReportsService } from './reports.service';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';
import { AppointmentStatusReportResponseDto } from './dto/appointment-status-report-response.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard/summary')
  @ApiOperation({
    summary: 'Obtener resumen general del dashboard clínico',
    description:
      'Consulta indicadores agregados desde reports-service a través del api-gateway.',
  })
  @ApiQuery({
    name: 'doctor_id',
    required: false,
    description: 'Filtra los indicadores por dentista.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen obtenido correctamente.',
    type: DashboardSummaryResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Token ausente o inválido.',
  })
  @ApiResponse({
    status: 403,
    description: 'Rol sin permisos suficientes.',
  })
  getDashboardSummary(
    @Headers('authorization') authorization: string,
    @Query('doctor_id') doctorId?: string,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    return this.reportsService.getDashboardSummary(authorization, doctorId);
  }

  @Get('appointments/by-status')
  @ApiOperation({
    summary: 'Obtener citas agrupadas por estado',
    description:
      'Devuelve datos para gráfica de citas por estado desde reports-service.',
  })
  @ApiQuery({
    name: 'doctor_id',
    required: false,
    description: 'Filtra la gráfica por dentista.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte obtenido correctamente.',
    type: AppointmentStatusReportResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Token ausente o inválido.',
  })
  @ApiResponse({
    status: 403,
    description: 'Rol sin permisos suficientes.',
  })
  getAppointmentsByStatus(
    @Headers('authorization') authorization: string,
    @Query('doctor_id') doctorId?: string,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    return this.reportsService.getAppointmentsByStatus(authorization, doctorId);
  }
}