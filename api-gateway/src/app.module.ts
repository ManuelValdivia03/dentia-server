import { Module } from '@nestjs/common';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';

@Module({
  imports: [AppointmentsModule, AuthModule, PrescriptionsModule],
})
export class AppModule {}