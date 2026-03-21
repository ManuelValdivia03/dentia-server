import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [AppointmentsModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
