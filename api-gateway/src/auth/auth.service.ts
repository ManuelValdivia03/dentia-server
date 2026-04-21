import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly authServiceBaseUrl =
    process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

  constructor(private readonly httpService: HttpService) {}

  async login(dto: LoginDto) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceBaseUrl}/auth/login`, dto),
      );

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        throw new HttpException(
          axiosError.response.data ?? 'Error en auth-service',
          axiosError.response.status,
        );
      }

      throw new HttpException(
        'No se pudo conectar con auth-service',
        503,
      );
    }
  }
}