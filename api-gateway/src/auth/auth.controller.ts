import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationCodeDto } from './dto/resend-verification-code.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RateLimit } from './rate-limit.decorator';
import { RateLimitGuard } from './rate-limit.guard';

function getEnvNumber(name: string, fallback: number) {
  const value = process.env[name];
  const parsed = Number(value);

  return value && Number.isFinite(parsed) ? parsed : fallback;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    name: 'auth-register',
    limit: getEnvNumber('AUTH_REGISTER_RATE_LIMIT_MAX', 3),
    windowMs:
      getEnvNumber('AUTH_REGISTER_RATE_LIMIT_WINDOW_SECONDS', 600) * 1000,
  })
  @UseInterceptors(
    FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: 'Registrar paciente o dentista' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Datos de registro. La foto es opcional para pacientes y obligatoria para dentistas. Los campos profesionales son obligatorios solo si role es DENTIST.',
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
          example: 'Juan Perez',
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
          example: 'Universidad Nacional Autonoma de Mexico',
          description: 'Obligatoria solo si role es DENTIST.',
        },
        descripcion: {
          type: 'string',
          example:
            'Cirujano dentista con experiencia en odontologia general y atencion preventiva.',
          description: 'Obligatoria solo si role es DENTIST.',
        },
        photo: {
          type: 'string',
          format: 'binary',
          description:
            'Foto de perfil. Opcional para pacientes y obligatoria para dentistas. Tamano maximo: 5 MB.',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description:
      'Registro iniciado. Si el correo ya tenia verificacion pendiente, se envia un nuevo codigo.',
  })
  @ApiBadRequestResponse({ description: 'Datos invalidos.' })
  @ApiConflictResponse({
    description: 'El correo ya esta registrado y verificado.',
  })
  @ApiResponse({ status: 429, description: 'Demasiadas solicitudes.' })
  @ApiResponse({ status: 415, description: 'Archivo no soportado.' })
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  register(
    @Body() dto: RegisterDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.authService.register(dto, photo);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    name: 'auth-verify-email',
    limit: getEnvNumber('AUTH_VERIFY_EMAIL_RATE_LIMIT_MAX', 5),
    windowMs:
      getEnvNumber('AUTH_VERIFY_EMAIL_RATE_LIMIT_WINDOW_SECONDS', 600) * 1000,
  })
  @ApiOperation({ summary: 'Verificar correo electronico' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiOkResponse({ description: 'Correo verificado correctamente.' })
  @ApiBadRequestResponse({
    description: 'Codigo invalido o datos incorrectos.',
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas solicitudes o intentos.',
  })
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification-code')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    name: 'auth-resend-verification-code',
    limit: getEnvNumber('AUTH_RESEND_VERIFICATION_RATE_LIMIT_MAX', 3),
    windowMs:
      getEnvNumber('AUTH_RESEND_VERIFICATION_RATE_LIMIT_WINDOW_SECONDS', 600) *
      1000,
  })
  @ApiOperation({ summary: 'Reenviar codigo de verificacion' })
  @ApiBody({ type: ResendVerificationCodeDto })
  @ApiOkResponse({ description: 'Codigo reenviado correctamente.' })
  @ApiBadRequestResponse({ description: 'Correo invalido.' })
  @ApiResponse({ status: 429, description: 'Demasiadas solicitudes.' })
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  resendVerificationCode(@Body() dto: ResendVerificationCodeDto) {
    return this.authService.resendVerificationCode(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    name: 'auth-forgot-password',
    limit: getEnvNumber('AUTH_REQUEST_PASSWORD_RESET_RATE_LIMIT_MAX', 3),
    windowMs:
      getEnvNumber(
        'AUTH_REQUEST_PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS',
        600,
      ) * 1000,
  })
  @ApiOperation({ summary: 'Solicitar codigo para recuperar contrasena' })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiOkResponse({ description: 'Solicitud procesada correctamente.' })
  @ApiBadRequestResponse({
    description: 'Solicitud reciente o datos invalidos.',
  })
  @ApiResponse({ status: 429, description: 'Demasiadas solicitudes.' })
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    name: 'auth-reset-password',
    limit: getEnvNumber('AUTH_RESET_PASSWORD_RATE_LIMIT_MAX', 5),
    windowMs:
      getEnvNumber('AUTH_RESET_PASSWORD_RATE_LIMIT_WINDOW_SECONDS', 600) * 1000,
  })
  @ApiOperation({ summary: 'Cambiar contrasena usando codigo de recuperacion' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: 'Contrasena actualizada correctamente.' })
  @ApiBadRequestResponse({ description: 'Codigo expirado o datos invalidos.' })
  @ApiUnauthorizedResponse({ description: 'Codigo de recuperacion invalido.' })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas solicitudes o intentos.',
  })
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    name: 'auth-login',
    limit: getEnvNumber('AUTH_LOGIN_RATE_LIMIT_MAX', 5),
    windowMs: getEnvNumber('AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS', 60) * 1000,
  })
  @ApiOperation({ summary: 'Iniciar sesion' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Login exitoso.' })
  @ApiUnauthorizedResponse({
    description:
      'Credenciales invalidas o correo pendiente de verificacion. Si requiere verificacion, la respuesta incluye requiresEmailVerification y email.',
  })
  @ApiBadRequestResponse({ description: 'Datos invalidos.' })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas solicitudes o intentos fallidos.',
  })
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    this.forwardSetCookie(res, result.setCookie);

    return result.data;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar sesion activa' })
  @ApiOkResponse({ description: 'Sesion renovada correctamente.' })
  @ApiUnauthorizedResponse({ description: 'Sesion expirada o invalida.' })
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refresh(req.headers.cookie);

    this.forwardSetCookie(res, result.setCookie);

    return result.data;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesion' })
  @ApiOkResponse({ description: 'Sesion cerrada correctamente.' })
  @ApiServiceUnavailableResponse({ description: 'auth-service no disponible.' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logout(req.headers.cookie);

    this.forwardSetCookie(res, result.setCookie);

    return result.data;
  }

  private forwardSetCookie(res: Response, setCookie?: string[]) {
    if (setCookie?.length) {
      res.setHeader('Set-Cookie', setCookie);
    }
  }
}
