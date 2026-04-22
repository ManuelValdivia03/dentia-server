/// <reference types="jest" />

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserRole } from '../users/enums/user-role.enum';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: any;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    usersRepository = {
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
    } as any;

    service = new AuthService(usersRepository, jwtService);

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

  it('onModuleInit debe sembrar 3 usuarios si no existen', async () => {
  usersRepository.count.mockResolvedValue(0);
  usersRepository.create.mockImplementation((data) => data as any);
  usersRepository.save.mockResolvedValue({} as any);

  (bcrypt.hash as jest.Mock).mockImplementation(async (value: string) => `hash-${value}`);

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
    }),
  );

    expect(usersRepository.create).toHaveBeenNthCalledWith(2, {
      email: 'patient1@dentia.local',
      passwordHash: 'hash-Patient123*',
      role: UserRole.PATIENT,
      domainId: 'p1',
      fullName: 'Paciente Demo',
      isActive: true,
    });

    expect(usersRepository.create).toHaveBeenNthCalledWith(3, {
      email: 'dentist1@dentia.local',
      passwordHash: 'hash-Dentist123*',
      role: UserRole.DENTIST,
      domainId: 'd1',
      fullName: 'Dra. Demo Dentia',
      specialty: 'Odontología general',
      isActive: true,
    });
  });

  it('login debe regresar token y usuario si las credenciales son válidas', async () => {
    const dto = {
      email: 'patient1@dentia.local',
      password: 'Patient123*',
    };

    const user = {
      id: 'u1',
      email: 'patient1@dentia.local',
      passwordHash: 'hash-real',
      role: UserRole.PATIENT,
      domainId: 'p1',
      isActive: true,
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
      email: 'patient1@dentia.local',
    });

    expect(result).toEqual({
      accessToken: 'jwt-token',
      user: {
        id: 'u1',
        email: 'patient1@dentia.local',
        role: UserRole.PATIENT,
        domainId: 'p1',
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
    });

    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      service.login({
        email: 'patient1@dentia.local',
        password: 'incorrecta123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});