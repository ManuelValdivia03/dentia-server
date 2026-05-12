import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';
import { InternalApiKeyGuard } from './internal-api-key.guard';
import { Appointment } from '../appointments/entities/appointment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment])],
  controllers: [InternalController],
  providers: [InternalService, InternalApiKeyGuard],
})
export class InternalModule {}