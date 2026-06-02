import { Controller, Get, Param, Res } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from '../auth/auth.service';

@ApiTags('Profile photos')
@Controller('profile-photos')
export class ProfilePhotosController {
  constructor(private readonly authService: AuthService) {}

  @Get(':domainId')
  @ApiOperation({ summary: 'Obtener foto de perfil por ID de dominio' })
  @ApiParam({ name: 'domainId', example: 'p-123' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp', 'application/octet-stream')
  @ApiOkResponse({ description: 'Imagen de perfil del usuario.' })
  @ApiNotFoundResponse({ description: 'Foto no encontrada.' })
  async photo(@Param('domainId') domainId: string, @Res() res: Response) {
    const { buffer, contentType } =
      await this.authService.getProfilePhoto(domainId);

    res.setHeader('Content-Type', contentType);
    res.send(buffer);
  }
}
