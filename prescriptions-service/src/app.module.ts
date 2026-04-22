import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'dentia',
      password: process.env.DB_PASSWORD ?? 'dentia123',
      database: process.env.DB_NAME ?? 'dentia_prescriptions',
      autoLoadEntities: true,
      synchronize: true,
    }),
    PrescriptionsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}