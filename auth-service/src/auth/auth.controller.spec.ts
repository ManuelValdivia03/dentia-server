import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(() => {
    service = {
      login: jest.fn(),
      onModuleInit: jest.fn(),
    } as any;

    controller = new AuthController(service);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('login debe delegar al service', async () => {
    const dto = {
      email: 'patient1@dentia.local',
      password: 'Patient123*',
    };

    const expected = {
      accessToken: 'jwt-token',
      user: {
        id: 'u1',
        email: dto.email,
        role: 'PATIENT',
        domainId: 'p1',
      },
    };

    service.login.mockResolvedValueOnce(expected as any);

    const result = await controller.login(dto as any);

    expect(service.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });
});