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
      login: jest.fn(),
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

    expect(service.register).toHaveBeenCalledWith(dto);
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

    service.login.mockResolvedValueOnce(expected as any);

    const result = await controller.login(dto as any);

    expect(service.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });
});