import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prescription } from './entities/prescription.entity';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { AppointmentsClient } from './appointments.client';
import { UsersClient } from '../users.client';
import { ClinicalRecord } from './clinical-records/entities/clinical-record.entity';
import { ClinicalEncounter } from './clinical-records/entities/clinical-encounter.entity';
import { ClinicalRecordsController } from './clinical-records/clinical-records.controller';
import { ClinicalRecordsService } from './clinical-records/clinical-records.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Prescription,
      ClinicalRecord,
      ClinicalEncounter,
    ]),
  ],
  controllers: [
    PrescriptionsController,
    ClinicalRecordsController,
  ],
  providers: [
    PrescriptionsService,
    ClinicalRecordsService,
    AppointmentsClient,
    UsersClient,
  ],
})
export class PrescriptionsModule {}