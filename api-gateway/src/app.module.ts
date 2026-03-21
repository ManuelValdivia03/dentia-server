import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [AuthModule, AppointmentsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}