import { Controller, Get, Param, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { Request } from 'express';
import { AppointmentsService } from '../appointments/appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

type AuthenticatedRequest = Request & {
  user: {
    role: UserRole;
    domainId: string;
  };
};

@ApiTags('Dentists')
@Controller('dentists')
export class DentistsController {
  constructor(private readonly authService: AuthService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar dentistas afiliados' })
  @ApiOkResponse({ description: 'Listado de dentistas.' })
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  findAll() {
    return this.authService.findAllDentists();
  }

  @Get('prioritized')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Listar dentistas priorizando los visitados por el paciente',
  })
  @ApiOkResponse({
    description: 'Listado de dentistas con visitados previamente primero.',
  })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Solo pacientes pueden usar esta vista.' })
  @ApiServiceUnavailableResponse({
    description: 'auth-service o appointments-service no disponible.',
  })
  async findPrioritized(@Req() req: AuthenticatedRequest) {
    const dentists = (await this.authService.findAllDentists()) as Array<{
      domainId: string;
      fullName?: string;
      email?: string;
    }>;

    const result = (await this.appointmentsService.findPreviousDentistIds(
      this.getAuthHeader(req),
    )) as { dentistIds?: string[] };

    const previousDentistIds = new Set(result?.dentistIds ?? []);

    return [...dentists].sort((a, b) => {
      const aVisited = previousDentistIds.has(a.domainId) ? 1 : 0;
      const bVisited = previousDentistIds.has(b.domainId) ? 1 : 0;

      if (aVisited !== bVisited) {
        return bVisited - aVisited;
      }

      return String(a.fullName ?? a.email ?? '').localeCompare(
        String(b.fullName ?? b.email ?? ''),
      );
    });
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

  private getAuthHeader(req: Request): string {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    return authHeader;
  }
}
