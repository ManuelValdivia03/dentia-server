import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationCodeDto } from './dto/resend-verification-code.dto';

function getEnvNumber(name: string, fallback: number) {
  const value = process.env[name];
  const parsed = Number(value);

  return value && Number.isFinite(parsed) ? parsed : fallback;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly refreshCookieName = 'dentia_refresh_token';

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: 'Registrar paciente' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
  description:
    'Datos de registro. La foto es opcional. Los campos de dentista son obligatorios solo si role es DENTIST.',
  schema: {
    type: 'object',
    required: ['email', 'password', 'fullName'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        example: 'paciente@test.com',
      },
      password: {
        type: 'string',
        example: 'Password123!',
      },
      fullName: {
        type: 'string',
        example: 'Juan Pérez',
      },
      role: {
        type: 'string',
        enum: ['PATIENT', 'DENTIST'],
        example: 'PATIENT',
      },
      cedulaProfesional: {
        type: 'string',
        example: '12345678',
        description: 'Obligatoria solo si role es DENTIST.',
      },
      escuela: {
        type: 'string',
        example: 'Universidad Nacional Autónoma de México',
        description: 'Obligatoria solo si role es DENTIST.',
      },
      descripcion: {
        type: 'string',
        example:
          'Cirujano dentista con experiencia en odontología general y atención preventiva.',
          description: 'Obligatoria solo si role es DENTIST.',
        },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Foto de perfil opcional. Tamaño máximo: 5 MB.',
        },
      },
    },
  })
  register(
    @Body() dto: RegisterDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.authService.registerPatient(dto, photo);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar correo electrónico' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiOkResponse({ description: 'Correo verificado correctamente' })
  @ApiBadRequestResponse({ description: 'Código inválido o datos incorrectos' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenviar código de verificación' })
  @ApiBody({ type: ResendVerificationCodeDto })
  @ApiOkResponse({ description: 'Código reenviado correctamente' })
  @ApiBadRequestResponse({ description: 'Correo inválido' })
  resendVerificationCode(@Body() dto: ResendVerificationCodeDto) {
    return this.authService.resendVerificationCode(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Login exitoso' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    this.setRefreshCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refresh(
      this.getRefreshTokenFromRequest(req),
    );

    this.setRefreshCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(
      this.getRefreshTokenFromRequest(req),
    );

    this.clearRefreshCookie(res);

    return result;
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(this.refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: getEnvNumber('REFRESH_TOKEN_ABSOLUTE_TTL_SECONDS', 28800) * 1000,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(this.refreshCookieName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
    });
  }

  private getRefreshTokenFromRequest(req: Request) {
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      return undefined;
    }

    return cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${this.refreshCookieName}=`))
      ?.slice(this.refreshCookieName.length + 1);
  }
}
