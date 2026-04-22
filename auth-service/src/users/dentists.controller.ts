import { Controller, Get, Param } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Controller('dentists')
export class DentistsController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  findAll() {
    return this.authService.findAllDentists();
  }

  @Get(':domainId')
  findOne(@Param('domainId') domainId: string) {
    return this.authService.findDentistByDomainId(domainId);
  }
}
