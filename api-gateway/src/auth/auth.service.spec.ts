import { HttpService } from '@nestjs/axios';
import { HttpException } from '@nestjs/common';
import axios from 'axios';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';

jest.mock('axios');

describe('AuthService', () => {
  let service: AuthService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(() => {
    httpService = {
      post: jest.fn(),
      get: jest.fn(),
    } as any;

    service = new AuthService(httpService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('register debe reenviar la petición a auth-service', async () => {
    const dto = {
      email: 'gateway@dentia.local',
      password: 'Password123*',
      fullName: 'Paciente Gateway',
    };

    const responseData = {
      message: 'Registro iniciado. Revisa tu correo para verificar tu cuenta.',
      user: {
        id: 'u1',
        email: dto.email,
        role: 'PATIENT',
        domainId: 'p-1',
        fullName: dto.fullName,
        emailVerified: false,
      },
    };

    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: responseData,
    });

    const result = await service.register(dto);

    expect(result).toEqual(responseData);
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:3001/auth/register',
      expect.anything(),
      expect.objectContaining({
        headers: expect.any(Object),
        maxBodyLength: Infinity,
      }),
    );
  });

  it('verifyEmail debe reenviar la petición a auth-service', async () => {
    const dto = {
      email: 'gateway@dentia.local',
      code: '123456',
    };

    const responseData = {
      message: 'Correo verificado correctamente',
      user: {
        id: 'u1',
        email: dto.email,
        role: 'PATIENT',
        domainId: 'p-1',
        emailVerified: true,
      },
    };

    httpService.post.mockReturnValueOnce(
      of({
        data: responseData,
      } as any),
    );

    const result = await service.verifyEmail(dto);

    expect(result).toEqual(responseData);
    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3001/auth/verify-email',
      dto,
    );
  });

  it('resendVerificationCode debe reenviar la petición a auth-service', async () => {
    const dto = {
      email: 'gateway@dentia.local',
    };

    const responseData = {
      message: 'Código de verificación reenviado',
    };

    httpService.post.mockReturnValueOnce(
      of({
        data: responseData,
      } as any),
    );

    const result = await service.resendVerificationCode(dto);

    expect(result).toEqual(responseData);
    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3001/auth/resend-verification-code',
      dto,
    );
  });

  it('login debe regresar login exitoso', async () => {
    const dto = {
      email: 'gateway@dentia.local',
      password: 'Password123*',
    };

    const responseData = {
      accessToken: 'token-test',
      user: {
        id: 'u1',
        email: dto.email,
        role: 'PATIENT',
        domainId: 'p-1',
        emailVerified: true,
      },
    };

    httpService.post.mockReturnValueOnce(
      of({
        data: responseData,
        headers: {
          'set-cookie': ['dentia_refresh_token=refresh-token'],
        },
      } as any),
    );

    const result = await service.login(dto);

    expect(result).toEqual({
      data: responseData,
      setCookie: ['dentia_refresh_token=refresh-token'],
    });
    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3001/auth/login',
      dto,
    );
  });

  it('debe propagar 401 cuando auth-service responde inválido', async () => {
    const dto = {
      email: 'gateway@dentia.local',
      password: 'mal123',
    };

    httpService.post.mockReturnValueOnce(
      throwError(() => ({
        response: {
          status: 401,
          data: {
            message: 'Credenciales inválidas',
            error: 'Unauthorized',
            statusCode: 401,
          },
        },
      })),
    );

    try {
      await service.login(dto);
      fail('Debió lanzar HttpException');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(401);
      expect((error as HttpException).getResponse()).toEqual({
        message: 'Credenciales inválidas',
        error: 'Unauthorized',
        statusCode: 401,
      });
    }
  });

  it('debe propagar 401 cuando el código de verificación es inválido', async () => {
    const dto = {
      email: 'gateway@dentia.local',
      code: '000000',
    };

    httpService.post.mockReturnValueOnce(
      throwError(() => ({
        response: {
          status: 401,
          data: {
            message: 'Código de verificación inválido',
            error: 'Unauthorized',
            statusCode: 401,
          },
        },
      })),
    );

    try {
      await service.verifyEmail(dto);
      fail('Debió lanzar HttpException');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(401);
      expect((error as HttpException).getResponse()).toEqual({
        message: 'Código de verificación inválido',
        error: 'Unauthorized',
        statusCode: 401,
      });
    }
  });

  it('debe regresar 503 si no puede conectar con auth-service', async () => {
    const dto = {
      email: 'gateway@dentia.local',
      password: 'Password123*',
    };

    httpService.post.mockReturnValueOnce(
      throwError(() => new Error('connect ECONNREFUSED')),
    );

    try {
      await service.login(dto);
      fail('Debió lanzar HttpException');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(503);
      expect((error as HttpException).getResponse()).toBe(
        'No se pudo conectar con auth-service',
      );
    }
  });
});
