import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { InternalModule } from './internal/internal.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { Appointment } from './appointments/entities/appointment.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'dentia',
      password: process.env.DB_PASSWORD ?? 'dentia123',
      database: process.env.DB_NAME ?? 'dentia_appointments',
      entities: [Appointment],
      synchronize: true,
    }),
    AppointmentsModule,
    InternalModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}