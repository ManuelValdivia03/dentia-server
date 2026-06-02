import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { ChatModule } from './chat/chat.module';
import { FilesModule } from './files/files.module';
import { ReportsModule } from './reports/reports.module';
import { HealthController } from './health.controller';
import { MetricsController } from './observability/metrics.controller';
import { HttpObservabilityInterceptor } from './observability/http-observability.interceptor';
import { MetricsService } from './observability/metrics.service';

@Module({
  imports: [
    AppointmentsModule,
    AuthModule,
    PrescriptionsModule,
    ChatModule,
    FilesModule,
    ReportsModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpObservabilityInterceptor,
    },
  ],
})
export class AppModule {}
