import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(() => {
    service = {
      register: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerificationCode: jest.fn(),
      requestPasswordReset: jest.fn(),
      resetPassword: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    } as any;

    controller = new AuthController(service);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register debe delegar al service', async () => {
    const dto = {
      email: 'gateway@dentia.local',
      password: 'Password123*',
      fullName: 'Paciente Gateway',
    };

    const expected = {
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

    service.register.mockResolvedValueOnce(expected as any);

    const result = await controller.register(dto as any);

    expect(service.register).toHaveBeenCalledWith(dto, undefined);
    expect(result).toEqual(expected);
  });

  it('verifyEmail debe delegar al service', async () => {
    const dto = {
      email: 'gateway@dentia.local',
      code: '123456',
    };

    const expected = {
      message: 'Correo verificado correctamente',
      user: {
        id: 'u1',
        email: dto.email,
        role: 'PATIENT',
        domainId: 'p-1',
        emailVerified: true,
      },
    };

    service.verifyEmail.mockResolvedValueOnce(expected as any);

    const result = await controller.verifyEmail(dto as any);

    expect(service.verifyEmail).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('resendVerificationCode debe delegar al service', async () => {
    const dto = {
      email: 'gateway@dentia.local',
    };

    const expected = {
      message: 'Código de verificación reenviado',
    };

    service.resendVerificationCode.mockResolvedValueOnce(expected as any);

    const result = await controller.resendVerificationCode(dto as any);

    expect(service.resendVerificationCode).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('requestPasswordReset debe delegar al service', async () => {
    const dto = {
      email: 'gateway@dentia.local',
    };

    const expected = {
      message:
        'Si el correo existe y esta verificado, enviaremos un codigo de recuperacion.',
    };

    service.requestPasswordReset.mockResolvedValueOnce(expected as any);

    const result = await controller.requestPasswordReset(dto as any);

    expect(service.requestPasswordReset).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('resetPassword debe delegar al service', async () => {
    const dto = {
      email: 'gateway@dentia.local',
      code: '123456',
      password: 'NewPassword123',
    };

    const expected = {
      message: 'Contrasena actualizada correctamente',
    };

    service.resetPassword.mockResolvedValueOnce(expected as any);

    const result = await controller.resetPassword(dto as any);

    expect(service.resetPassword).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('login debe delegar al service', async () => {
    const dto = {
      email: 'gateway@dentia.local',
      password: 'Password123*',
    };

    const expected = {
      accessToken: 'jwt-token',
      user: {
        id: 'u1',
        email: dto.email,
        role: 'PATIENT',
        domainId: 'p-1',
        emailVerified: true,
      },
    };

    service.login.mockResolvedValueOnce({
      data: expected,
      setCookie: ['dentia_refresh_token=refresh-token; HttpOnly; Path=/auth'],
    } as any);
    const response = {
      setHeader: jest.fn(),
    };

    const result = await controller.login(dto as any, response as any);

    expect(service.login).toHaveBeenCalledWith(dto);
    expect(response.setHeader).toHaveBeenCalledWith('Set-Cookie', [
      'dentia_refresh_token=refresh-token; HttpOnly; Path=/auth',
    ]);
    expect(result).toEqual(expected);
  });
});
