import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { User } from './users/entities/user.entity';
import { RefreshSession } from './auth/entities/refresh-session.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'dentia',
      password: process.env.DB_PASSWORD ?? 'dentia123',
      database: process.env.DB_NAME ?? 'dentia_auth',
      entities: [User, RefreshSession],
      synchronize: true,
    }),
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
