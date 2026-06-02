import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '../auth/auth.service';

@Controller('profile-photos')
export class ProfilePhotosController {
  constructor(private readonly authService: AuthService) {}

  @Get(':domainId')
  async photo(@Param('domainId') domainId: string, @Res() res: Response) {
    const { buffer, contentType } =
      await this.authService.getProfilePhoto(domainId);

    res.setHeader('Content-Type', contentType);
    res.send(buffer);
  }
}
