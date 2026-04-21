import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'APPOINTMENTS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.APPOINTMENTS_TCP_HOST ?? 'localhost',
          port: Number(process.env.APPOINTMENTS_TCP_PORT ?? 4001),
        },
      },
    ]),
    AuthModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}