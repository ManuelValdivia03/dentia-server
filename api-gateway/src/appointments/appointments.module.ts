import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AuthModule } from '../auth/auth.module';
import { DentistRatingsController } from './dentist-ratings.controller';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [AuthModule],
  controllers: [AppointmentsController, DentistRatingsController, PaymentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
