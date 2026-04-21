/// <reference types="jest" />

import { ForbiddenException } from '@nestjs/common';
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

  it('PATIENT solo debe ver sus citas en findAll', async () => {
    service.findAll.mockResolvedValueOnce(appointments as any);

    const req: any = {
      user: {
        role: UserRole.PATIENT,
        domainId: 'p1',
      },
    };

    const result = await controller.findAll(req);

    expect(result).toEqual([appointments[0]]);
  });

  it('DENTIST solo debe ver sus citas en findAll', async () => {
    service.findAll.mockResolvedValueOnce(appointments as any);

    const req: any = {
      user: {
        role: UserRole.DENTIST,
        domainId: 'd2',
      },
    };

    const result = await controller.findAll(req);

    expect(result).toEqual([appointments[1]]);
  });

  it('ADMIN debe ver todas las citas en findAll', async () => {
    service.findAll.mockResolvedValueOnce(appointments as any);

    const req: any = {
      user: {
        role: UserRole.ADMIN,
        domainId: 'admin1',
      },
    };

    const result = await controller.findAll(req);

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

    service.create.mockResolvedValueOnce({
      ...dto,
      patientId: 'p1',
    } as any);

    const req: any = {
      user: {
        role: UserRole.PATIENT,
        domainId: 'p1',
      },
    };

    await controller.create(dto, req);

    expect(service.create).toHaveBeenCalledWith({
      ...dto,
      patientId: 'p1',
    });
  });

  it('PATIENT no debe poder confirmar citas', async () => {
    const req: any = {
      user: {
        role: UserRole.PATIENT,
        domainId: 'p1',
      },
    };

    service.findOne.mockResolvedValueOnce({
      id: 'a1',
      patientId: 'p1',
      dentistId: 'd1',
    } as any);

    await expect(controller.confirm('a1', req)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('DENTIST debe poder confirmar una cita propia', async () => {
    const req: any = {
      user: {
        role: UserRole.DENTIST,
        domainId: 'd1',
      },
    };

    const appointment = {
      id: 'a1',
      patientId: 'p1',
      dentistId: 'd1',
      status: 'CONFIRMED',
    };

    service.findOne.mockResolvedValueOnce(appointment as any);
    service.confirm.mockResolvedValueOnce(appointment as any);

    const result = await controller.confirm('a1', req);

    expect(service.confirm).toHaveBeenCalledWith('a1');
    expect(result).toEqual(appointment);
  });

  it('DENTIST no debe poder confirmar una cita ajena', async () => {
    const req: any = {
      user: {
        role: UserRole.DENTIST,
        domainId: 'd1',
      },
    };

    service.findOne.mockResolvedValueOnce({
      id: 'a2',
      patientId: 'p2',
      dentistId: 'd2',
    } as any);

    await expect(controller.confirm('a2', req)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('ADMIN debe poder ver cualquier cita', async () => {
    const req: any = {
      user: {
        role: UserRole.ADMIN,
        domainId: 'admin1',
      },
    };

    const appointment = {
      id: 'a2',
      patientId: 'p2',
      dentistId: 'd2',
    };

    service.findOne.mockResolvedValueOnce(appointment as any);

    const result = await controller.findOne('a2', req);

    expect(result).toEqual(appointment);
  });
});