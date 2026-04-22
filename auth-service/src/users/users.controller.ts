import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
  };
};

@Controller('profile')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.authService.getProfileByUserId(req.user.sub);
  }
}
