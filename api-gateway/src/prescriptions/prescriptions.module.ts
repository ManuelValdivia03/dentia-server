import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    ClientsModule.register([
      {
        name: 'PRESCRIPTIONS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.PRESCRIPTIONS_TCP_HOST ?? 'localhost',
          port: Number(process.env.PRESCRIPTIONS_TCP_PORT ?? 4002),
        },
      },
    ]),
  ],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
})
export class PrescriptionsModule {}