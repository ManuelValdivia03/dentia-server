import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UserLookupController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':domainId')
  findByDomainId(@Param('domainId') domainId: string) {
    return this.authService.findUserByDomainId(domainId);
  }
}
