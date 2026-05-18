import { Module } from '@nestjs/common';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { ChatModule } from './chat/chat.module';
import { FilesModule } from './files/files.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    AppointmentsModule,
    AuthModule,
    PrescriptionsModule,
    ChatModule,
    FilesModule,
    ReportsModule,
  ],
})
export class AppModule {}