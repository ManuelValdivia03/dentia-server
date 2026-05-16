/// <reference types="jest" />

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserRole } from '../users/enums/user-role.enum';
import { MailService } from '../mail/mail.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: any;
  let jwtService: jest.Mocked<JwtService>;
  let mailService: jest.Mocked<MailService>;

  beforeEach(() => {
    usersRepository = {
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
    } as any;

    mailService = {
      sendVerificationCode: jest.fn(),
    } as any;

    service = new AuthService(usersRepository, jwtService, mailService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('onModuleInit no debe sembrar usuarios si ya existen', async () => {
    usersRepository.count.mockResolvedValueOnce(1);

    await service.onModuleInit();

    expect(usersRepository.count).toHaveBeenCalled();
    expect(usersRepository.create).not.toHaveBeenCalled();
    expect(usersRepository.save).not.toHaveBeenCalled();
  });

  it('onModuleInit debe sembrar 3 usuarios verificados si no existen', async () => {
    usersRepository.count.mockResolvedValueOnce(0);
    usersRepository.create.mockImplementation((data: any) => data);
    usersRepository.save.mockResolvedValue({} as any);

    (bcrypt.hash as jest.Mock).mockImplementation(
      async (value: string) => `hash-${value}`,
    );

    await service.onModuleInit();

    expect(usersRepository.save).toHaveBeenCalledTimes(3);

    expect(usersRepository.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        email: 'admin@dentia.local',
        passwordHash: 'hash-Admin123*',
        role: UserRole.ADMIN,
        domainId: 'admin1',
        fullName: 'Administrador Dentia',
        isActive: true,
        emailVerified: true,
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
        emailVerificationAttempts: 0,
        emailVerificationLastSentAt: null,
      }),
    );

    expect(usersRepository.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        email: 'patient1@dentia.local',
        passwordHash: 'hash-Patient123*',
        role: UserRole.PATIENT,
        domainId: 'p1',
        fullName: 'Paciente Demo',
        isActive: true,
        emailVerified: true,
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
        emailVerificationAttempts: 0,
        emailVerificationLastSentAt: null,
      }),
    );

    expect(usersRepository.create).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        email: 'dentist1@dentia.local',
        passwordHash: 'hash-Dentist123*',
        role: UserRole.DENTIST,
        domainId: 'd1',
        fullName: 'Dra. Demo Dentia',
        specialty: 'Odontología general',
        isActive: true,
        emailVerified: true,
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
        emailVerificationAttempts: 0,
        emailVerificationLastSentAt: null,
      }),
    );
  });

  it('registerPatient debe fallar si el correo ya existe', async () => {
    usersRepository.findOne.mockResolvedValueOnce({
      id: 'u1',
      email: 'nuevo@dentia.local',
    });

    await expect(
      service.registerPatient({
        email: 'nuevo@dentia.local',
        password: 'Password123*',
        fullName: 'Paciente Nuevo',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('registerPatient debe crear usuario no verificado y enviar código', async () => {
    const dto = {
      email: 'nuevo@dentia.local',
      password: 'Password123*',
      fullName: 'Paciente Nuevo',
    };

    usersRepository.findOne.mockResolvedValueOnce(null);

    (bcrypt.hash as jest.Mock).mockImplementation(
      async (value: string) => `hash-${value}`,
    );

    usersRepository.create.mockImplementation((data: any) => ({
      id: 'u1',
      ...data,
    }));

    usersRepository.save.mockImplementation(async (user: any) => user);

    const result = await service.registerPatient(dto);

    expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);

    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: dto.email,
        passwordHash: 'hash-Password123*',
        role: UserRole.PATIENT,
        domainId: expect.stringMatching(/^p-/),
        fullName: dto.fullName,
        isActive: true,
        emailVerified: false,
        emailVerificationCodeHash: expect.any(String),
        emailVerificationExpiresAt: expect.any(Date),
        emailVerificationAttempts: 0,
        emailVerificationLastSentAt: expect.any(Date),
      }),
    );

    expect(mailService.sendVerificationCode).toHaveBeenCalledWith(
      dto.email,
      expect.stringMatching(/^\d{6}$/),
    );

    expect(result).toEqual({
      message: 'Registro iniciado. Revisa tu correo para verificar tu cuenta.',
      user: expect.objectContaining({
        id: 'u1',
        email: dto.email,
        role: UserRole.PATIENT,
        fullName: dto.fullName,
        emailVerified: false,
      }),
    });
  });

    it('registerPatient debe crear dentista no verificado si role es DENTIST', async () => {
    const dto = {
      email: 'dentista@dentia.local',
      password: 'Password123*',
      fullName: 'Dra. Nueva',
      role: 'DENTIST' as const,
    };

    usersRepository.findOne.mockResolvedValueOnce(null);

    (bcrypt.hash as jest.Mock).mockImplementation(
      async (value: string) => `hash-${value}`,
    );

    usersRepository.create.mockImplementation((data: any) => ({
      id: 'd-user-1',
      ...data,
    }));

    usersRepository.save.mockImplementation(async (user: any) => user);

    const result = await service.registerPatient(dto);

    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: dto.email,
        passwordHash: 'hash-Password123*',
        role: UserRole.DENTIST,
        domainId: expect.stringMatching(/^d-/),
        fullName: dto.fullName,
        isActive: true,
        emailVerified: false,
        emailVerificationCodeHash: expect.any(String),
        emailVerificationExpiresAt: expect.any(Date),
        emailVerificationAttempts: 0,
        emailVerificationLastSentAt: expect.any(Date),
      }),
    );

    expect(mailService.sendVerificationCode).toHaveBeenCalledWith(
      dto.email,
      expect.stringMatching(/^\d{6}$/),
    );

    expect(result).toEqual({
      message: 'Registro iniciado. Revisa tu correo para verificar tu cuenta.',
      user: expect.objectContaining({
        id: 'd-user-1',
        email: dto.email,
        role: UserRole.DENTIST,
        fullName: dto.fullName,
        emailVerified: false,
      }),
    });
  });

  it('login debe regresar token y usuario si las credenciales son válidas y el correo está verificado', async () => {
    const dto = {
      email: 'patient1@dentia.local',
      password: 'Patient123*',
    };

    const user = {
      id: 'u1',
      email: dto.email,
      passwordHash: 'hash-real',
      role: UserRole.PATIENT,
      domainId: 'p1',
      isActive: true,
      emailVerified: true,
    };

    usersRepository.findOne.mockResolvedValueOnce(user);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    jwtService.signAsync.mockResolvedValueOnce('jwt-token');

    const result = await service.login(dto);

    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { email: dto.email, isActive: true },
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'u1',
      role: UserRole.PATIENT,
      domainId: 'p1',
      email: dto.email,
    });

    expect(result).toEqual({
      accessToken: 'jwt-token',
      user: {
        id: 'u1',
        email: dto.email,
        role: UserRole.PATIENT,
        domainId: 'p1',
        fullName: undefined,
        specialty: undefined,
        emailVerified: true,
      },
    });
  });

  it('login debe fallar si el usuario no existe', async () => {
    usersRepository.findOne.mockResolvedValueOnce(null);

    await expect(
      service.login({
        email: 'noexiste@dentia.local',
        password: 'cualquier123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login debe fallar si la contraseña no coincide', async () => {
    usersRepository.findOne.mockResolvedValueOnce({
      id: 'u1',
      email: 'patient1@dentia.local',
      passwordHash: 'hash-real',
      role: UserRole.PATIENT,
      domainId: 'p1',
      isActive: true,
      emailVerified: true,
    });

    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      service.login({
        email: 'patient1@dentia.local',
        password: 'incorrecta123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login debe fallar si el correo no está verificado', async () => {
    usersRepository.findOne.mockResolvedValueOnce({
      id: 'u1',
      email: 'patient1@dentia.local',
      passwordHash: 'hash-real',
      role: UserRole.PATIENT,
      domainId: 'p1',
      isActive: true,
      emailVerified: false,
    });

    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    await expect(
      service.login({
        email: 'patient1@dentia.local',
        password: 'Patient123*',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('verifyEmail debe fallar si el código es incorrecto', async () => {
    const user = {
      id: 'u1',
      email: 'nuevo@dentia.local',
      role: UserRole.PATIENT,
      domainId: 'p1',
      isActive: true,
      emailVerified: false,
      emailVerificationCodeHash: 'hash-code',
      emailVerificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      emailVerificationAttempts: 0,
    };

    usersRepository.findOne.mockResolvedValueOnce(user);
    usersRepository.save.mockImplementation(async (savedUser: any) => savedUser);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      service.verifyEmail({
        email: 'nuevo@dentia.local',
        code: '000000',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(user.emailVerificationAttempts).toBe(1);
    expect(usersRepository.save).toHaveBeenCalledWith(user);
  });

  it('verifyEmail debe marcar el correo como verificado si el código es correcto', async () => {
    const user = {
      id: 'u1',
      email: 'nuevo@dentia.local',
      role: UserRole.PATIENT,
      domainId: 'p1',
      isActive: true,
      emailVerified: false,
      emailVerificationCodeHash: 'hash-code',
      emailVerificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      emailVerificationAttempts: 0,
      emailVerificationLastSentAt: new Date(),
      fullName: 'Paciente Nuevo',
      specialty: undefined,
    };

    usersRepository.findOne.mockResolvedValueOnce(user);
    usersRepository.save.mockImplementation(async (savedUser: any) => savedUser);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    const result = await service.verifyEmail({
      email: 'nuevo@dentia.local',
      code: '123456',
    });

    expect(user.emailVerified).toBe(true);
    expect(user.emailVerificationCodeHash).toBeNull();
    expect(user.emailVerificationExpiresAt).toBeNull();
    expect(user.emailVerificationAttempts).toBe(0);
    expect(user.emailVerificationLastSentAt).toBeNull();

    expect(result).toEqual({
      message: 'Correo verificado correctamente',
      user: {
        id: 'u1',
        email: 'nuevo@dentia.local',
        role: UserRole.PATIENT,
        domainId: 'p1',
        fullName: 'Paciente Nuevo',
        specialty: undefined,
        emailVerified: true,
      },
    });
  });

  it('resendVerificationCode debe generar nuevo código y enviarlo', async () => {
    const user = {
      id: 'u1',
      email: 'nuevo@dentia.local',
      role: UserRole.PATIENT,
      domainId: 'p1',
      isActive: true,
      emailVerified: false,
      emailVerificationCodeHash: 'old-hash',
      emailVerificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      emailVerificationAttempts: 2,
      emailVerificationLastSentAt: null,
    };

    usersRepository.findOne.mockResolvedValueOnce(user);
    usersRepository.save.mockImplementation(async (savedUser: any) => savedUser);

    (bcrypt.hash as jest.Mock).mockImplementation(
      async (value: string) => `hash-${value}`,
    );

    const result = await service.resendVerificationCode({
      email: 'nuevo@dentia.local',
    });

    expect(user.emailVerificationCodeHash).toEqual(
      expect.stringMatching(/^hash-\d{6}$/),
    );
    expect(user.emailVerificationExpiresAt).toBeInstanceOf(Date);
    expect(user.emailVerificationAttempts).toBe(0);
    expect(user.emailVerificationLastSentAt).toBeInstanceOf(Date);

    expect(mailService.sendVerificationCode).toHaveBeenCalledWith(
      user.email,
      expect.stringMatching(/^\d{6}$/),
    );

    expect(result).toEqual({
      message: 'Código de verificación reenviado',
    });
  });
});