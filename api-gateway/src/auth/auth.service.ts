import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { AxiosError, AxiosResponse } from 'axios';
import { firstValueFrom, Observable } from 'rxjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly authServiceBaseUrl =
    process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

  constructor(private readonly httpService: HttpService) {}

  register(dto: RegisterDto) {
    return this.forwardRequest(() =>
    this.httpService.post(`${this.authServiceBaseUrl}/auth/register`, dto),
    );
  }

  login(dto: LoginDto) {
    return this.forwardRequest(() =>
      this.httpService.post(`${this.authServiceBaseUrl}/auth/login`, dto),
    );
  }

  getMe(authorization: string) {
    return this.forwardRequest(() =>
      this.httpService.get(`${this.authServiceBaseUrl}/users/me`, {
        headers: { authorization },
      }),
    );
  }

  findAllDentists() {
    return this.forwardRequest(() =>
      this.httpService.get(`${this.authServiceBaseUrl}/dentists`),
    );
  }

  findDentistByDomainId(domainId: string) {
    return this.forwardRequest(() =>
      this.httpService.get(`${this.authServiceBaseUrl}/dentists/${domainId}`),
    );
  }

  private async forwardRequest<T>(
    request: () => Observable<AxiosResponse<T>>,
  ): Promise<T> {
    try {
      const response = await firstValueFrom(request());
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        throw new HttpException(
          axiosError.response.data ?? 'Error en auth-service',
          axiosError.response.status,
        );
      }

      throw new HttpException('No se pudo conectar con auth-service', 503);
    }
  }
}