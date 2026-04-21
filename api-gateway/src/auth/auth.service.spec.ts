import { HttpService } from '@nestjs/axios';
import { HttpException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(() => {
    httpService = {
      post: jest.fn(),
    } as any;

    service = new AuthService(httpService);
  });

  it('debe regresar login exitoso', async () => {
    const dto = {
      email: 'patient1@dentia.local',
      password: 'Patient123*',
    };

    const responseData = {
      accessToken: 'token-test',
      user: {
        id: 'u1',
        email: dto.email,
        role: 'PATIENT',
        domainId: 'p1',
      },
    };

    httpService.post.mockReturnValueOnce(
      of({
        data: responseData,
      } as any),
    );

    const result = await service.login(dto);

    expect(result).toEqual(responseData);
    expect(httpService.post).toHaveBeenCalledTimes(1);
    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3001/auth/login',
      dto,
    );
  });

  it('debe propagar 401 cuando auth-service responde inválido', async () => {
    const dto = {
      email: 'patient1@dentia.local',
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

  it('debe regresar 503 si no puede conectar con auth-service', async () => {
    const dto = {
      email: 'patient1@dentia.local',
      password: 'Patient123*',
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