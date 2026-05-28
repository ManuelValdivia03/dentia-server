import {
  Controller,
  Get,
  Param,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dentists')
export class DentistRatingsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get(':dentistId/ratings/summary')
  @Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
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