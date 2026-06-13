import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AppointmentsService } from './appointments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('Payments')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('appointments/:appointmentId')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @ApiOperation({ summary: 'Registrar el pago de una cita completada' })
  @ApiCreatedResponse({ description: 'Pago registrado correctamente.' })
  create(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: CreatePaymentDto,
    @Req() req: Request,
  ) {
    return this.appointmentsService.createPayment(
      appointmentId,
      dto,
      this.getAuthHeader(req),
    );
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @ApiOperation({ summary: 'Consultar corte de caja y pagos por rango' })
  @ApiQuery({ name: 'from', required: false, example: '2026-06-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-06-30' })
  @ApiQuery({ name: 'dentistId', required: false })
  findAll(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('dentistId') dentistId: string | undefined,
    @Req() req: Request,
  ) {
    return this.appointmentsService.getPayments(
      from,
      to,
      dentistId,
      this.getAuthHeader(req),
    );
  }

  private getAuthHeader(req: Request) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    return authHeader;
  }
}
