import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '../auth/auth.service';

@Controller('dentists')
export class DentistsController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  findAll() {
    return this.authService.findAllDentists();
  }

  @Get(':domainId/photo')
  async photo(@Param('domainId') domainId: string, @Res() res: Response) {
    const { buffer, contentType } =
      await this.authService.getDentistPhoto(domainId);

    res.setHeader('Content-Type', contentType);
    res.send(buffer);
  }

  @Get(':domainId')
  findOne(@Param('domainId') domainId: string) {
    return this.authService.findDentistByDomainId(domainId);
  }
}
