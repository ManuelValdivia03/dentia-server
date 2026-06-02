import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosResponse } from 'axios';
import FormData from 'form-data';
import { firstValueFrom, Observable } from 'rxjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationCodeDto } from './dto/resend-verification-code.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly authServiceBaseUrl =
    process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

  constructor(private readonly httpService: HttpService) {}

  async register(dto: RegisterDto, photo?: Express.Multer.File) {
    const form = new FormData();

    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined && value !== null) {
        form.append(key, String(value));
      }
    }

    if (photo) {
      form.append('photo', photo.buffer, {
        filename: photo.originalname,
        contentType: photo.mimetype,
        knownLength: photo.size,
      });
    }

    try {
      const response = await axios.post(
        `${this.authServiceBaseUrl}/auth/register`,
        form,
        {
          headers: { ...form.getHeaders() },
          maxBodyLength: Infinity,
        },
      );

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        this.logServiceFailure(
          'auth-service',
          'register',
          axiosError.response.status,
        );
        throw new HttpException(
          (axiosError.response.data as any) ?? 'Error en auth-service',
          axiosError.response.status,
        );
      }

      this.logServiceFailure('auth-service', 'register');
      throw new HttpException('No se pudo conectar con auth-service', 503);
    }
  }

  async getDentistPhoto(domainId: string) {
    return this.getProfilePhoto(domainId, `/dentists/${domainId}/photo`);
  }

  async getProfilePhoto(domainId: string, path?: string) {
    try {
      const response = await axios.get(
        `${this.authServiceBaseUrl}${path ?? `/profile-photos/${domainId}`}`,
        { responseType: 'stream' },
      );

      return {
        stream: response.data,
        headers: response.headers,
      };
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        this.logServiceFailure(
          'auth-service',
          'profile-photo',
          axiosError.response.status,
        );
        throw new HttpException(
          'Foto de perfil no encontrada',
          axiosError.response.status,
        );
      }

      this.logServiceFailure('auth-service', 'profile-photo');
      throw new HttpException('No se pudo conectar con auth-service', 503);
    }
  }

  verifyEmail(dto: VerifyEmailDto) {
    return this.forwardRequest(() =>
      this.httpService.post(
        `${this.authServiceBaseUrl}/auth/verify-email`,
        dto,
      ),
    );
  }

  resendVerificationCode(dto: ResendVerificationCodeDto) {
    return this.forwardRequest(() =>
      this.httpService.post(
        `${this.authServiceBaseUrl}/auth/resend-verification-code`,
        dto,
      ),
    );
  }

  requestPasswordReset(dto: RequestPasswordResetDto) {
    return this.forwardRequest(() =>
      this.httpService.post(
        `${this.authServiceBaseUrl}/auth/forgot-password`,
        dto,
      ),
    );
  }

  resetPassword(dto: ResetPasswordDto) {
    return this.forwardRequest(() =>
      this.httpService.post(
        `${this.authServiceBaseUrl}/auth/reset-password`,
        dto,
      ),
    );
  }

  login(dto: LoginDto) {
    return this.forwardRequestWithCookies(() =>
      this.httpService.post(`${this.authServiceBaseUrl}/auth/login`, dto),
    );
  }

  refresh(cookieHeader?: string) {
    return this.forwardRequestWithCookies(() =>
      this.httpService.post(
        `${this.authServiceBaseUrl}/auth/refresh`,
        {},
        {
          headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
        },
      ),
    );
  }

  logout(cookieHeader?: string) {
    return this.forwardRequestWithCookies(() =>
      this.httpService.post(
        `${this.authServiceBaseUrl}/auth/logout`,
        {},
        {
          headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
        },
      ),
    );
  }

  getMe(authorization: string) {
    return this.forwardRequest(() =>
      this.httpService.get(`${this.authServiceBaseUrl}/profile`, {
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
        this.logServiceFailure(
          'auth-service',
          'forward-request',
          axiosError.response.status,
        );
        throw new HttpException(
          axiosError.response.data ?? 'Error en auth-service',
          axiosError.response.status,
        );
      }

      this.logServiceFailure('auth-service', 'forward-request');
      throw new HttpException('No se pudo conectar con auth-service', 503);
    }
  }

  private async forwardRequestWithCookies<T>(
    request: () => Observable<AxiosResponse<T>>,
  ): Promise<{ data: T; setCookie?: string[] }> {
    try {
      const response = await firstValueFrom(request());

      return {
        data: response.data,
        setCookie: response.headers['set-cookie'],
      };
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        this.logServiceFailure(
          'auth-service',
          'forward-request-with-cookies',
          axiosError.response.status,
        );
        throw new HttpException(
          axiosError.response.data ?? 'Error en auth-service',
          axiosError.response.status,
        );
      }

      this.logServiceFailure('auth-service', 'forward-request-with-cookies');
      throw new HttpException('No se pudo conectar con auth-service', 503);
    }
  }

  private logServiceFailure(
    targetService: string,
    operation: string,
    statusCode?: number,
  ) {
    this.logger.warn(
      JSON.stringify({
        event: 'service_call_failed',
        service: 'api-gateway',
        targetService,
        operation,
        statusCode,
      }),
    );
  }
}
