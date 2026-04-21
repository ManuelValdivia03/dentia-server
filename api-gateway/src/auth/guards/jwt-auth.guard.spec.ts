import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;

  const createContext = (headers: Record<string, string> = {}) => {
    const request: any = { headers };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    return { context, request };
  };

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as any;

    guard = new JwtAuthGuard(jwtService);
  });

  it('debe lanzar 401 si no hay authorization header', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe lanzar 401 si el formato del token es inválido', async () => {
    const { context } = createContext({
      authorization: 'Token abc',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe permitir acceso con token válido y adjuntar user al request', async () => {
    const payload = {
      sub: 'u1',
      role: 'PATIENT',
      domainId: 'p1',
      email: 'patient1@dentia.local',
    };

    jwtService.verifyAsync.mockResolvedValueOnce(payload as any);

    const { context, request } = createContext({
      authorization: 'Bearer token-valido',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('token-valido', {
      secret: 'dentia-dev-secret',
    });
    expect(request.user).toEqual(payload);
  });

  it('debe lanzar 401 si verifyAsync falla', async () => {
    jwtService.verifyAsync.mockRejectedValueOnce(new Error('invalid token'));

    const { context } = createContext({
      authorization: 'Bearer token-invalido',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});