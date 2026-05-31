import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
  };
};

@ApiTags('Profile')
@ApiBearerAuth('JWT')
@Controller('profile')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiOkResponse({ description: 'Perfil del usuario autenticado.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.authService.getMe(req.headers.authorization as string);
  }
}
