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

@ApiTags('Dentists')
@Controller('dentists')
export class DentistsController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'Listar dentistas afiliados' })
  @ApiOkResponse({ description: 'Listado de dentistas.' })
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  findAll() {
    return this.authService.findAllDentists();
  }

  @Get(':domainId/photo')
  @ApiOperation({ summary: 'Obtener foto de perfil de un dentista' })
  @ApiParam({ name: 'domainId', example: 'dentist_123' })
  @ApiProduces('image/jpeg', 'image/png', 'application/octet-stream')
  @ApiOkResponse({ description: 'Imagen de perfil del dentista.' })
  @ApiNotFoundResponse({ description: 'Foto no encontrada.' })
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  async photo(@Param('domainId') domainId: string, @Res() res: Response) {
    const { stream, headers } =
      await this.authService.getDentistPhoto(domainId);

    const contentType = headers['content-type'];
    if (typeof contentType === 'string') {
      res.setHeader('Content-Type', contentType);
    }

    stream.pipe(res);
  }

  @Get(':domainId')
  @ApiOperation({ summary: 'Consultar dentista por ID de dominio' })
  @ApiParam({ name: 'domainId', example: 'dentist_123' })
  @ApiOkResponse({ description: 'Detalle del dentista.' })
  @ApiNotFoundResponse({ description: 'Dentista no encontrado.' })
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  findOne(@Param('domainId') domainId: string) {
    return this.authService.findDentistByDomainId(domainId);
  }
}
