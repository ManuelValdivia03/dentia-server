import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar paciente en Dentia' })
  @ApiCreatedResponse({ description: 'Usuario registrado correctamente.' })
  @ApiBadRequestResponse({ description: 'Datos inválidos o usuario existente.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión y obtener JWT' })
  @ApiOkResponse({ description: 'Login correcto. Devuelve accessToken y datos del usuario.' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas.' })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}