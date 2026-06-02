import { Controller, Get, Param, Res } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiServiceUnavailableResponse,
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
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  async photo(@Param('domainId') domainId: string, @Res() res: Response) {
    const { stream, headers } = await this.authService.getProfilePhoto(domainId);

    const contentType = headers['content-type'];
    if (typeof contentType === 'string') {
      res.setHeader('Content-Type', contentType);
    }

    stream.pipe(res);
  }
}
