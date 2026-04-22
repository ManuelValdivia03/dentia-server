/// <reference types="jest" />

import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { UserRole } from '../auth/enums/user-role.enum';

describe('AppointmentsController', () => {
  let controller: AppointmentsController;
  let service: jest.Mocked<AppointmentsService>;

  const appointments = [
    {
      id: 'a1',
      patientId: 'p1',
      dentistId: 'd1',
      status: 'PENDING',
    },
    {
      id: 'a2',
      patientId: 'p2',
      dentistId: 'd2',
      status: 'PENDING',
    },
  ];

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      getAvailability: jest.fn(),
      create: jest.fn(),
      reschedule: jest.fn(),
      cancel: jest.fn(),
      confirm: jest.fn(),
      complete: jest.fn(),
    } as any;

    controller = new AppointmentsController(service);
  });

  it('PATIENT debe delegar findAll con req.user', async () => {
    service.findAll.mockResolvedValueOnce([appointments[0]] as any);

    const req: any = {
      user: {
        sub: 'u1',
        role: UserRole.PATIENT,
        domainId: 'p1',
        email: 'patient1@dentia.local',
      },
    };

    const result = await controller.findAll(req);

    expect(service.findAll).toHaveBeenCalledWith(req.user);
    expect(result).toEqual([appointments[0]]);
  });

  it('DENTIST debe delegar findAll con req.user', async () => {
    service.findAll.mockResolvedValueOnce([appointments[1]] as any);

    const req: any = {
      user: {
        sub: 'u2',
        role: UserRole.DENTIST,
        domainId: 'd2',
        email: 'dentist1@dentia.local',
      },
    };

    const result = await controller.findAll(req);

    expect(service.findAll).toHaveBeenCalledWith(req.user);
    expect(result).toEqual([appointments[1]]);
  });

  it('ADMIN debe delegar findAll con req.user', async () => {
    service.findAll.mockResolvedValueOnce(appointments as any);

    const req: any = {
      user: {
        sub: 'u3',
        role: UserRole.ADMIN,
        domainId: 'admin1',
        email: 'admin@dentia.local',
      },
    };

    const result = await controller.findAll(req);

    expect(service.findAll).toHaveBeenCalledWith(req.user);
    expect(result).toEqual(appointments);
  });

  it('PATIENT debe forzar patientId desde el token al crear', async () => {
    const dto: any = {
      patientId: 'otro-paciente',
      dentistId: 'd1',
      startAt: '2026-04-22T10:00:00.000Z',
      endAt: '2026-04-22T11:00:00.000Z',
      reason: 'Limpieza',
    };

    const req: any = {
      user: {
        sub: 'u1',
        role: UserRole.PATIENT,
        domainId: 'p1',
        email: 'patient1@dentia.local',
      },
    };

    service.create.mockResolvedValueOnce({
      ...dto,
      patientId: 'p1',
    } as any);

    const result = await controller.create(dto, req);

    expect(service.create).toHaveBeenCalledWith(
      {
        ...dto,
        patientId: 'p1',
      },
      req.user,
    );
    expect(result).toEqual({
      ...dto,
      patientId: 'p1',
    });
  });

  it('ADMIN debe mantener el patientId enviado al crear', async () => {
    const dto: any = {
      patientId: 'p2',
      dentistId: 'd1',
      startAt: '2026-04-22T10:00:00.000Z',
      endAt: '2026-04-22T11:00:00.000Z',
      reason: 'Limpieza',
    };

    const req: any = {
      user: {
        sub: 'u3',
        role: UserRole.ADMIN,
        domainId: 'admin1',
        email: 'admin@dentia.local',
      },
    };

    service.create.mockResolvedValueOnce(dto);

    const result = await controller.create(dto, req);

    expect(service.create).toHaveBeenCalledWith(dto, req.user);
    expect(result).toEqual(dto);
  });

  it('debe delegar confirm con id y req.user', async () => {
    const req: any = {
      user: {
        sub: 'u2',
        role: UserRole.DENTIST,
        domainId: 'd1',
        email: 'dentist1@dentia.local',
      },
    };

    const appointment = {
      id: 'a1',
      patientId: 'p1',
      dentistId: 'd1',
      status: 'CONFIRMED',
    };

    service.confirm.mockResolvedValueOnce(appointment as any);

    const result = await controller.confirm('a1', req);

    expect(service.confirm).toHaveBeenCalledWith('a1', req.user);
    expect(result).toEqual(appointment);
  });

  it('debe delegar findOne con id y req.user', async () => {
    const req: any = {
      user: {
        sub: 'u3',
        role: UserRole.ADMIN,
        domainId: 'admin1',
        email: 'admin@dentia.local',
      },
    };

    const appointment = {
      id: 'a2',
      patientId: 'p2',
      dentistId: 'd2',
    };

    service.findOne.mockResolvedValueOnce(appointment as any);

    const result = await controller.findOne('a2', req);

    expect(service.findOne).toHaveBeenCalledWith('a2', req.user);
    expect(result).toEqual(appointment);
  });
});