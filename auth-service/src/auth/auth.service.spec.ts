/// <reference types="jest" />

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import {
  ConflictException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserRole } from '../users/enums/user-role.enum';
import { MailService } from '../mail/mail.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: any;
  let refreshSessionsRepository: any;
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

    refreshSessionsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
    } as any;

    mailService = {
      sendVerificationCode: jest.fn(),
      sendPasswordResetCode: jest.fn(),
    } as any;

    service = new AuthService(
      usersRepository,
      refreshSessionsRepository,
      jwtService,
      mailService,
    );

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

  it('onModuleInit no debe sembrar usuarios demo en produccion', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      await service.onModuleInit();

      expect(usersRepository.count).not.toHaveBeenCalled();
      expect(usersRepository.create).not.toHaveBeenCalled();
      expect(usersRepository.save).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
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
      emailVerified: true,
    });

    await expect(
      service.registerPatient({
        email: 'nuevo@dentia.local',
        password: 'Password123*',
        fullName: 'Paciente Nuevo',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('registerPatient debe reenviar codigo si el correo existe sin verificar', async () => {
    const existingUser = {
      id: 'u1',
      email: 'nuevo@dentia.local',
      role: UserRole.PATIENT,
      domainId: 'p1',
      isActive: true,
      emailVerified: false,
      emailVerificationCodeHash: 'old-hash',
      emailVerificationExpiresAt: new Date(Date.now() - 1000),
      emailVerificationAttempts: 3,
      emailVerificationLastSentAt: new Date(Date.now() - 1000),
      fullName: 'Paciente Nuevo',
    };

    usersRepository.findOne.mockResolvedValueOnce(existingUser);
    usersRepository.save.mockImplementation(async (user: any) => user);
    (bcrypt.hash as jest.Mock).mockImplementation(
      async (value: string) => `hash-${value}`,
    );

    const result = await service.registerPatient({
      email: 'nuevo@dentia.local',
      password: 'Password123*',
      fullName: 'Paciente Nuevo',
    });

    expect(existingUser.emailVerificationCodeHash).toEqual(
      expect.stringMatching(/^hash-\d{6}$/),
    );
    expect(existingUser.emailVerificationExpiresAt).toBeInstanceOf(Date);
    expect(existingUser.emailVerificationAttempts).toBe(0);
    expect(existingUser.emailVerificationLastSentAt).toBeInstanceOf(Date);
    expect(usersRepository.save).toHaveBeenCalledWith(existingUser);
    expect(mailService.sendVerificationCode).toHaveBeenCalledWith(
      existingUser.email,
      expect.stringMatching(/^\d{6}$/),
    );
    expect(result).toEqual({
      message:
        'Ya habia un registro pendiente. Te enviamos un nuevo codigo de verificacion.',
      user: expect.objectContaining({
        id: 'u1',
        email: existingUser.email,
        emailVerified: false,
      }),
      requiresEmailVerification: true,
    });
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

  it('registerPatient debe permitir foto opcional en paciente', async () => {
    const dto = {
      email: 'foto@dentia.local',
      password: 'Password123*',
      fullName: 'Paciente Foto',
    };
    const photo = {
      buffer: Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
      ]),
      mimetype: 'image/png',
      size: 12,
    } as Express.Multer.File;

    usersRepository.findOne.mockResolvedValueOnce(null);
    (bcrypt.hash as jest.Mock).mockImplementation(
      async (value: string) => `hash-${value}`,
    );
    usersRepository.create.mockImplementation((data: any) => ({
      id: 'u-photo',
      ...data,
    }));
    usersRepository.save.mockImplementation(async (user: any) => user);

    await service.registerPatient(dto, photo);

    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: dto.email,
        role: UserRole.PATIENT,
        profilePhoto: photo.buffer,
        profilePhotoContentType: photo.mimetype,
      }),
    );
  });

  it('registerPatient debe crear dentista no verificado si role es DENTIST', async () => {
    const dto = {
      email: 'dentista@dentia.local',
      password: 'Password123*',
      fullName: 'Dra. Nueva',
      role: 'DENTIST' as const,
      cedulaProfesional: '12345678',
      escuela: 'Universidad Nacional',
      descripcion: 'OdontologÃ­a general',
    };
    const photo = {
      buffer: Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
      ]),
      mimetype: 'image/png',
      size: 12,
    } as Express.Multer.File;

    usersRepository.findOne.mockResolvedValueOnce(null);
    usersRepository.findOne.mockResolvedValueOnce(null);

    (bcrypt.hash as jest.Mock).mockImplementation(
      async (value: string) => `hash-${value}`,
    );

    usersRepository.create.mockImplementation((data: any) => ({
      id: 'd-user-1',
      ...data,
    }));

    usersRepository.save.mockImplementation(async (user: any) => user);

    const result = await service.registerPatient(dto, photo);

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
    refreshSessionsRepository.create.mockImplementation((data: any) => ({
      id: 'session-1',
      ...data,
    }));
    refreshSessionsRepository.save.mockImplementation(async (session: any) => ({
      id: 'session-1',
      ...session,
    }));
    jwtService.signAsync.mockResolvedValueOnce('jwt-token');

    const result = await service.login(dto);

    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { email: dto.email, isActive: true },
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith(
      {
        sub: 'u1',
        sid: 'session-1',
        role: UserRole.PATIENT,
        domainId: 'p1',
        email: dto.email,
      },
      {
        expiresIn: '2m',
      },
    );

    expect(result).toEqual({
      accessToken: 'jwt-token',
      refreshToken: expect.any(String),
      user: expect.objectContaining({
        id: 'u1',
        email: dto.email,
        role: UserRole.PATIENT,
        domainId: 'p1',
        emailVerified: true,
      }),
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

  it('login debe bloquear temporalmente tras demasiados intentos fallidos', async () => {
    const user = {
      id: 'u1',
      email: 'patient1@dentia.local',
      passwordHash: 'hash-real',
      role: UserRole.PATIENT,
      domainId: 'p1',
      isActive: true,
      emailVerified: true,
      failedLoginAttempts: 4,
      loginLockedUntil: null,
    };

    usersRepository.findOne.mockResolvedValueOnce(user);
    usersRepository.save.mockImplementation(
      async (savedUser: any) => savedUser,
    );
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      service.login({
        email: 'patient1@dentia.local',
        password: 'incorrecta123',
      }),
    ).rejects.toThrow(HttpException);

    expect(user.failedLoginAttempts).toBe(5);
    expect(user.loginLockedUntil).toBeInstanceOf(Date);
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
    usersRepository.save.mockImplementation(
      async (savedUser: any) => savedUser,
    );
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

  it('verifyEmail debe bloquear temporalmente al llegar al maximo de intentos', async () => {
    const user = {
      id: 'u1',
      email: 'nuevo@dentia.local',
      role: UserRole.PATIENT,
      domainId: 'p1',
      isActive: true,
      emailVerified: false,
      emailVerificationCodeHash: 'hash-code',
      emailVerificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      emailVerificationAttempts: 4,
      emailVerificationLockedUntil: null,
    };

    usersRepository.findOne.mockResolvedValueOnce(user);
    usersRepository.save.mockImplementation(
      async (savedUser: any) => savedUser,
    );
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      service.verifyEmail({
        email: 'nuevo@dentia.local',
        code: '000000',
      }),
    ).rejects.toThrow(HttpException);

    expect(user.emailVerificationAttempts).toBe(5);
    expect(user.emailVerificationLockedUntil).toBeInstanceOf(Date);
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
    usersRepository.save.mockImplementation(
      async (savedUser: any) => savedUser,
    );
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
      user: expect.objectContaining({
        id: 'u1',
        email: 'nuevo@dentia.local',
        role: UserRole.PATIENT,
        domainId: 'p1',
        fullName: 'Paciente Nuevo',
        specialty: undefined,
        emailVerified: true,
      }),
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
    usersRepository.save.mockImplementation(
      async (savedUser: any) => savedUser,
    );

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

  it('requestPasswordReset debe generar codigo y enviarlo si la cuenta esta verificada', async () => {
    const user = {
      id: 'u1',
      email: 'patient1@dentia.local',
      role: UserRole.PATIENT,
      domainId: 'p1',
      isActive: true,
      emailVerified: true,
      passwordResetCodeHash: null,
      passwordResetExpiresAt: null,
      passwordResetAttempts: 0,
      passwordResetLastSentAt: null,
      passwordResetLockedUntil: null,
    };

    usersRepository.findOne.mockResolvedValueOnce(user);
    usersRepository.save.mockImplementation(
      async (savedUser: any) => savedUser,
    );
    (bcrypt.hash as jest.Mock).mockImplementation(
      async (value: string) => `hash-${value}`,
    );

    const result = await service.requestPasswordReset({
      email: 'patient1@dentia.local',
    });

    expect(user.passwordResetCodeHash).toEqual(
      expect.stringMatching(/^hash-\d{6}$/),
    );
    expect(user.passwordResetExpiresAt).toBeInstanceOf(Date);
    expect(user.passwordResetAttempts).toBe(0);
    expect(user.passwordResetLastSentAt).toBeInstanceOf(Date);
    expect(mailService.sendPasswordResetCode).toHaveBeenCalledWith(
      user.email,
      expect.stringMatching(/^\d{6}$/),
    );
    expect(result).toEqual({
      message:
        'Si el correo existe y esta verificado, enviaremos un codigo de recuperacion.',
    });
  });

  it('resetPassword debe actualizar contrasena e invalidar sesiones activas', async () => {
    const user = {
      id: 'u1',
      email: 'patient1@dentia.local',
      passwordHash: 'old-hash',
      role: UserRole.PATIENT,
      domainId: 'p1',
      isActive: true,
      emailVerified: true,
      passwordResetCodeHash: 'reset-hash',
      passwordResetExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      passwordResetAttempts: 1,
      passwordResetLastSentAt: new Date(),
      passwordResetLockedUntil: null,
      failedLoginAttempts: 2,
      loginLockedUntil: new Date(Date.now() + 10 * 60 * 1000),
    };

    usersRepository.findOne.mockResolvedValueOnce(user);
    usersRepository.save.mockImplementation(
      async (savedUser: any) => savedUser,
    );
    refreshSessionsRepository.update.mockResolvedValueOnce({ affected: 2 });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hash-NewPassword123');

    const result = await service.resetPassword({
      email: 'patient1@dentia.local',
      code: '123456',
      password: 'NewPassword123',
    });

    expect(user.passwordHash).toBe('hash-NewPassword123');
    expect(user.passwordResetCodeHash).toBeNull();
    expect(user.passwordResetExpiresAt).toBeNull();
    expect(user.passwordResetAttempts).toBe(0);
    expect(user.passwordResetLastSentAt).toBeNull();
    expect(user.passwordResetLockedUntil).toBeNull();
    expect(user.failedLoginAttempts).toBe(0);
    expect(user.loginLockedUntil).toBeNull();
    expect(refreshSessionsRepository.update).toHaveBeenCalledWith(
      { userId: user.id, revokedAt: expect.anything() },
      { revokedAt: expect.any(Date) },
    );
    expect(result).toEqual({
      message: 'Contrasena actualizada correctamente',
    });
  });

  it('refresh debe fallar si no recibe refresh token', async () => {
    await expect(service.refresh()).rejects.toThrow(UnauthorizedException);

    expect(refreshSessionsRepository.findOne).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('refresh debe generar nuevo accessToken y rotar refreshToken si la sesion es valida', async () => {
    const now = Date.now();

    const session = {
      id: 'session-1',
      userId: 'u1',
      tokenHash: 'old-hash',
      lastActivityAt: new Date(now),
      expiresAt: new Date(now + 60 * 60 * 1000),
      revokedAt: null,
    };

    const user = {
      id: 'u1',
      email: 'patient1@dentia.local',
      role: UserRole.PATIENT,
      domainId: 'p1',
      fullName: 'Paciente Demo',
      isActive: true,
      emailVerified: true,
    };

    refreshSessionsRepository.findOne.mockResolvedValueOnce(session);
    refreshSessionsRepository.save.mockImplementation(async (saved: any) => saved);
    usersRepository.findOne.mockResolvedValueOnce(user);
    jwtService.signAsync.mockResolvedValueOnce('new-access-token');

    const result = await service.refresh('valid-refresh-token');

    expect(refreshSessionsRepository.findOne).toHaveBeenCalled();
    expect(refreshSessionsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'session-1',
        userId: 'u1',
        tokenHash: expect.any(String),
        lastActivityAt: expect.any(Date),
        revokedAt: null,
      }),
    );

    expect(jwtService.signAsync).toHaveBeenCalledWith(
      {
        sub: 'u1',
        sid: 'session-1',
        role: UserRole.PATIENT,
        domainId: 'p1',
        email: user.email,
      },
      {
        expiresIn: '2m',
      },
    );

    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: expect.any(String),
      user: expect.objectContaining({
        id: 'u1',
        email: user.email,
        role: UserRole.PATIENT,
        domainId: 'p1',
        emailVerified: true,
      }),
    });
  });

  it('refresh debe revocar sesion expirada y fallar', async () => {
    const session = {
      id: 'session-1',
      userId: 'u1',
      tokenHash: 'old-hash',
      lastActivityAt: new Date(Date.now() - 60 * 1000),
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
    };

    refreshSessionsRepository.findOne.mockResolvedValueOnce(session);
    refreshSessionsRepository.save.mockImplementation(async (saved: any) => saved);

    await expect(service.refresh('expired-refresh-token')).rejects.toThrow(
      UnauthorizedException,
    );

    expect(session.revokedAt).toBeInstanceOf(Date);
    expect(refreshSessionsRepository.save).toHaveBeenCalledWith(session);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('logout debe revocar sesion si el refresh token existe', async () => {
    const session = {
      id: 'session-1',
      userId: 'u1',
      tokenHash: 'token-hash',
      revokedAt: null,
    };

    refreshSessionsRepository.findOne.mockResolvedValueOnce(session);
    refreshSessionsRepository.save.mockImplementation(async (saved: any) => saved);

    const result = await service.logout('refresh-token');

    expect(session.revokedAt).toBeInstanceOf(Date);
    expect(refreshSessionsRepository.save).toHaveBeenCalledWith(session);
    expect(result).toEqual({ message: 'Sesion cerrada' });
  });

  it('logout debe responder ok aunque no reciba refresh token', async () => {
    const result = await service.logout();

    expect(refreshSessionsRepository.findOne).not.toHaveBeenCalled();
    expect(result).toEqual({ message: 'Sesion cerrada' });
  });
});
