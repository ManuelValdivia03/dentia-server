import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
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

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post('prescriptions')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  create(
    @Body() dto: CreatePrescriptionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.prescriptionsService.create(dto, req.user);
  }

  @Get('prescriptions/:id')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.PATIENT)
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.prescriptionsService.findOne(id, req.user);
  }

  @Get('appointments/:appointmentId/prescriptions')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.PATIENT)
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