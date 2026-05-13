import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { InternalModule } from './internal/internal.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { Appointment } from './appointments/entities/appointment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'dentia'),
        password: config.get<string>('DB_PASSWORD', 'dentia123'),
        database: config.get<string>('DB_NAME', 'dentia_appointments'),
        entities: [Appointment],
        synchronize: true,
      }),
    }),

    AppointmentsModule,
    InternalModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}