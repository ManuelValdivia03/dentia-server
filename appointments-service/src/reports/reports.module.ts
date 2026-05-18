import { Module } from '@nestjs/common';
import { ReportsClientService } from './reports-client.service';

@Module({
  providers: [ReportsClientService],
  exports: [ReportsClientService],
})
export class ReportsModule {}