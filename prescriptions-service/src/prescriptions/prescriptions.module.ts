import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prescription } from './entities/prescription.entity';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { AppointmentsClient } from './appointments.client';

@Module({
  imports: [TypeOrmModule.forFeature([Prescription])],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, AppointmentsClient],
})
export class PrescriptionsModule {}