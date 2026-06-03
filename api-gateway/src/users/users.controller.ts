import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

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

  @UseGuards(JwtAuthGuard)
  @Patch()
  @ApiOperation({ summary: 'Actualizar perfil no sensible' })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ description: 'Perfil actualizado.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o invÃ¡lido.' })
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  @UseInterceptors(
    FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.authService.updateMe(
      req.headers.authorization as string,
      dto,
      photo,
    );
  }
}
