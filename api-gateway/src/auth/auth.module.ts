import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UsersController } from '../users/users.controller';
import { DentistsController } from '../dentists/dentists.controller';
import { ProfilePhotosController } from '../dentists/profile-photos.controller';
import { UserLookupController } from '../users/user-lookup.controller';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  imports: [
    HttpModule,
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
  providers: [AuthService, JwtAuthGuard, RolesGuard, RateLimitGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
