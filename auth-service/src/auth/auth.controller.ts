import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
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
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}