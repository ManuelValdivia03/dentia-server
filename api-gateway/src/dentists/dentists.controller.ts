import { Controller, Get, Param } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';

@ApiTags('Dentists')
@Controller('dentists')
export class DentistsController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'Listar dentistas afiliados disponibles' })
  @ApiOkResponse({ description: 'Listado de dentistas afiliados.' })
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  findAll() {
    return this.authService.findAllDentists();
  }

  @Get(':domainId')
  @ApiOperation({ summary: 'Consultar dentista por domainId' })
  @ApiParam({
    name: 'domainId',
    example: 'd1',
    description: 'ID de dominio del dentista.',
  })
  @ApiOkResponse({ description: 'Detalle del dentista afiliado.' })
  @ApiNotFoundResponse({ description: 'Dentista no encontrado.' })
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  findOne(@Param('domainId') domainId: string) {
    return this.authService.findDentistByDomainId(domainId);
  }
}
