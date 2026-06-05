import { UnauthorizedException } from '@nestjs/common';
import { DentistsController } from './dentists.controller';
import { UserRole } from '../auth/enums/user-role.enum';

describe('DentistsController', () => {
  const authService = {
    findAllDentists: jest.fn(),
    findDentistByDomainId: jest.fn(),
    getDentistPhoto: jest.fn(),
  };

  const appointmentsService = {
    findPreviousDentistIds: jest.fn(),
  };

  let controller: DentistsController;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new DentistsController(
      authService as any,
      appointmentsService as any,
    );
  });

  it('should return all dentists with previously visited dentists first', async () => {
    authService.findAllDentists.mockResolvedValue([
      {
        domainId: 'd2',
        fullName: 'Dra. Nueva Dentia',
        email: 'nueva@dentia.local',
      },
      {
        domainId: 'd1',
        fullName: 'Dra. Demo Dentia',
        email: 'demo@dentia.local',
      },
      {
        domainId: 'd3',
        fullName: 'Dr. Otro Dentia',
        email: 'otro@dentia.local',
      },
    ]);

    appointmentsService.findPreviousDentistIds.mockResolvedValue({
      dentistIds: ['d1'],
    });

    const result = await controller.findPrioritized({
      headers: {
        authorization: 'Bearer token',
      },
      user: {
        role: UserRole.PATIENT,
        domainId: 'p1',
      },
    } as any);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      domainId: 'd1',
      previouslyVisited: true,
    });
    expect(result[1].previouslyVisited).toBe(false);
    expect(result[2].previouslyVisited).toBe(false);

    expect(authService.findAllDentists).toHaveBeenCalledTimes(1);
    expect(appointmentsService.findPreviousDentistIds).toHaveBeenCalledWith(
      'Bearer token',
    );
  });

  it('should return all dentists as not previously visited when patient has no previous dentists', async () => {
    authService.findAllDentists.mockResolvedValue([
      {
        domainId: 'd1',
        fullName: 'Dra. Demo Dentia',
      },
      {
        domainId: 'd2',
        fullName: 'Dr. Nuevo Dentia',
      },
    ]);

    appointmentsService.findPreviousDentistIds.mockResolvedValue({
      dentistIds: [],
    });

    const result = await controller.findPrioritized({
      headers: {
        authorization: 'Bearer token',
      },
      user: {
        role: UserRole.PATIENT,
        domainId: 'p1',
      },
    } as any);

    expect(result).toHaveLength(2);
    expect(result.every((dentist) => dentist.previouslyVisited === false)).toBe(
      true,
    );
  });

  it('should throw unauthorized when authorization header is missing', async () => {
    authService.findAllDentists.mockResolvedValue([]);

    await expect(
      controller.findPrioritized({
        headers: {},
        user: {
          role: UserRole.PATIENT,
          domainId: 'p1',
        },
      } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});