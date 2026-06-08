/// <reference types="jest" />

import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../auth/enums/user-role.enum';

describe('AppointmentsController', () => {
  let controller: AppointmentsController;
  let service: jest.Mocked<AppointmentsService>;
  const authorization = 'Bearer test-token';

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
    createRating: jest.fn(),
  } as any;

    controller = new AppointmentsController(service);
  });

  it('PATIENT debe delegar findAll con req.user', async () => {
    service.findAll.mockResolvedValueOnce([appointments[0]] as any);

    const req: any = {
      headers: { authorization },
      user: {
        sub: 'u1',
        role: UserRole.PATIENT,
        domainId: 'p1',
        email: 'patient1@dentia.local',
      },
    };

    const result = await controller.findAll(req);

    expect(service.findAll).toHaveBeenCalledWith(authorization);
    expect(result).toEqual([appointments[0]]);
  });

  it('DENTIST debe delegar findAll con req.user', async () => {
    service.findAll.mockResolvedValueOnce([appointments[1]] as any);

    const req: any = {
      headers: { authorization },
      user: {
        sub: 'u2',
        role: UserRole.DENTIST,
        domainId: 'd2',
        email: 'dentist1@dentia.local',
      },
    };

    const result = await controller.findAll(req);

    expect(service.findAll).toHaveBeenCalledWith(authorization);
    expect(result).toEqual([appointments[1]]);
  });

  it('ADMIN debe delegar findAll con req.user', async () => {
    service.findAll.mockResolvedValueOnce(appointments as any);

    const req: any = {
      headers: { authorization },
      user: {
        sub: 'u3',
        role: UserRole.ADMIN,
        domainId: 'admin1',
        email: 'admin@dentia.local',
      },
    };

    const result = await controller.findAll(req);

    expect(service.findAll).toHaveBeenCalledWith(authorization);
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
      headers: { authorization },
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
      authorization,
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
      headers: { authorization },
      user: {
        sub: 'u3',
        role: UserRole.ADMIN,
        domainId: 'admin1',
        email: 'admin@dentia.local',
      },
    };

    service.create.mockResolvedValueOnce(dto);

    const result = await controller.create(dto, req);

    expect(service.create).toHaveBeenCalledWith(dto, authorization);
    expect(result).toEqual(dto);
  });

  it('debe delegar confirm con id y req.user', async () => {
    const req: any = {
      headers: { authorization },
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

    expect(service.confirm).toHaveBeenCalledWith('a1', authorization);
    expect(result).toEqual(appointment);
  });

  it('debe delegar findOne con id y req.user', async () => {
    const req: any = {
      headers: { authorization },
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

    expect(service.findOne).toHaveBeenCalledWith('a2', authorization);
    expect(result).toEqual(appointment);
  });

  it('getAvailability debe delegar dentistId, date y Authorization header', async () => {
    const req: any = {
      headers: { authorization },
      user: {
        sub: 'u1',
        role: UserRole.PATIENT,
        domainId: 'p1',
        email: 'patient1@dentia.local',
      },
    };

    const availability = {
      dentistId: 'd1',
      date: '2026-06-01',
      slots: ['10:00', '11:00'],
    };

    service.getAvailability.mockResolvedValueOnce(availability as any);

    const result = await controller.getAvailability('d1', '2026-06-01', req);

    expect(service.getAvailability).toHaveBeenCalledWith(
      'd1',
      '2026-06-01',
      authorization,
    );
    expect(result).toEqual(availability);
  });

  it('findByDay debe delegar date, dentistId opcional y Authorization header', async () => {
    const req: any = {
      headers: { authorization },
      user: {
        sub: 'u2',
        role: UserRole.DENTIST,
        domainId: 'd1',
        email: 'dentist1@dentia.local',
      },
    };

    const dayAgenda = [
      {
        id: 'a1',
        patientId: 'p1',
        dentistId: 'd1',
        status: 'CONFIRMED',
      },
    ];

    service.findByDay = jest.fn().mockResolvedValueOnce(dayAgenda as any);

    const result = await controller.findByDay('2026-06-01', undefined, req);

    expect(service.findByDay).toHaveBeenCalledWith(
      '2026-06-01',
      undefined,
      authorization,
    );
    expect(result).toEqual(dayAgenda);
  });

  it('reschedule debe delegar id, dto y Authorization header', async () => {
    const req: any = {
      headers: { authorization },
      user: {
        sub: 'u1',
        role: UserRole.PATIENT,
        domainId: 'p1',
        email: 'patient1@dentia.local',
      },
    };

    const dto: any = {
      startAt: '2026-06-01T15:00:00.000Z',
      endAt: '2026-06-01T16:00:00.000Z',
      reason: 'Cambio de horario',
    };

    const appointment = {
      id: 'a1',
      patientId: 'p1',
      dentistId: 'd1',
      status: 'PENDING',
      ...dto,
    };

    service.reschedule.mockResolvedValueOnce(appointment as any);

    const result = await controller.reschedule('a1', dto, req);

    expect(service.reschedule).toHaveBeenCalledWith('a1', dto, authorization);
    expect(result).toEqual(appointment);
  });

  it('cancel debe delegar id y Authorization header', async () => {
    const req: any = {
      headers: { authorization },
      user: {
        sub: 'u1',
        role: UserRole.PATIENT,
        domainId: 'p1',
        email: 'patient1@dentia.local',
      },
    };

    const appointment = {
      id: 'a1',
      patientId: 'p1',
      dentistId: 'd1',
      status: 'CANCELLED',
    };

    service.cancel.mockResolvedValueOnce(appointment as any);

    const result = await controller.cancel('a1', req);

    expect(service.cancel).toHaveBeenCalledWith('a1', authorization);
    expect(result).toEqual(appointment);
  });

  it('complete debe delegar id y Authorization header', async () => {
    const req: any = {
      headers: { authorization },
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
      status: 'COMPLETED',
    };

    service.complete.mockResolvedValueOnce(appointment as any);

    const result = await controller.complete('a1', req);

    expect(service.complete).toHaveBeenCalledWith('a1', authorization);
    expect(result).toEqual(appointment);
  });

  it('createRating debe delegar id, dto y Authorization header', async () => {
    const req: any = {
      headers: { authorization },
      user: {
        sub: 'u1',
        role: UserRole.PATIENT,
        domainId: 'p1',
        email: 'patient1@dentia.local',
      },
    };

    const dto: any = {
      score: 5,
      comment: 'Excelente atención',
    };

    const rating = {
      id: 'r1',
      appointmentId: 'a1',
      patientId: 'p1',
      dentistId: 'd1',
      ...dto,
    };

    service.createRating.mockResolvedValueOnce(rating as any);

    const result = await controller.createRating('a1', dto, req);

    expect(service.createRating).toHaveBeenCalledWith('a1', dto, authorization);
    expect(result).toEqual(rating);
  });

  it('findOne debe lanzar UnauthorizedException si falta Authorization header', () => {
    const req: any = {
      headers: {},
      user: {
        sub: 'u3',
        role: UserRole.ADMIN,
        domainId: 'admin1',
        email: 'admin@dentia.local',
      },
    };

    expect(() => controller.findOne('a1', req)).toThrow(UnauthorizedException);
    expect(service.findOne).not.toHaveBeenCalled();
  });
});