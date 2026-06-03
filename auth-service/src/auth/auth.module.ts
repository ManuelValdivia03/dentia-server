import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { RefreshSession } from './entities/refresh-session.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersController } from '../users/users.controller';
import { DentistsController } from '../users/dentists.controller';
import { ProfilePhotosController } from '../users/profile-photos.controller';
import { UserLookupController } from '../users/user-lookup.controller';
import { MailService } from '../mail/mail.service';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshSession]),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dentia-dev-secret',
      signOptions: { expiresIn: (process.env.ACCESS_TOKEN_TTL || '2m') as any },
    }),
  ],
  controllers: [
    AuthController,
    UsersController,
    DentistsController,
    ProfilePhotosController,
    UserLookupController,
  ],
  providers: [AuthService, JwtAuthGuard, MailService, RateLimitGuard],
})
export class AuthModule {}
