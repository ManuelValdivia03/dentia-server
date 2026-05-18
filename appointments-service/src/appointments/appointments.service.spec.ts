/// <reference types="jest" />

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { AppointmentsService } from './appointments.service';
import { Appointment } from './entities/appointment.entity';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { RequestUserRole } from './interfaces/request-user.interface';
import { EventsPublisher } from '../events/events.publisher';
import { ReportsClientService } from '../reports/reports-client.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let repository: any;
  let eventsPublisher: any;
  let reportsClient: any;

  const adminRequester = {
    sub: 'u-admin',
    role: RequestUserRole.ADMIN,
    domainId: 'admin1',
    email: 'admin@dentia.local',
  };

  const patientRequester = {
    sub: 'u-p1',
    role: RequestUserRole.PATIENT,
    domainId: 'p1',
    email: 'patient1@dentia.local',
  };

  const dentistRequester = {
    sub: 'u-d1',
    role: RequestUserRole.DENTIST,
    domainId: 'd1',
    email: 'dentist1@dentia.local',
  };

  const makeQb = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  });

  const makeAppointment = (overrides: Partial<Appointment> = {}) =>
    ({
      id: 'a1',
      patientId: 'p1',
      dentistId: 'd1',
      startAt: new Date('2026-04-22T10:00:00.000Z'),
      endAt: new Date('2026-04-22T11:00:00.000Z'),
      status: AppointmentStatus.PENDING,
      reason: 'Limpieza',
      notes: 'N/A',
      ...overrides,
    }) as Appointment;

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    eventsPublisher = {
      publishAppointmentCreated: jest.fn().mockResolvedValue(undefined),
    };

    reportsClient = {
      sendAppointmentSnapshot: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getRepositoryToken(Appointment),
          useValue: repository,
        },
        {
          provide: EventsPublisher,
          useValue: eventsPublisher,
        },
        {
          provide: ReportsClientService,
          useValue: reportsClient,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findAll debe regresar citas ordenadas por startAt ASC para admin', async () => {
    const appointments = [{ id: 'a1' }, { id: 'a2' }];
    repository.find.mockResolvedValueOnce(appointments);

    const result = await service.findAll(adminRequester as any);

    expect(repository.find).toHaveBeenCalledWith({
      where: {},
      order: { startAt: 'ASC' },
    });
    expect(result).toEqual(appointments);
  });

  it('findAll debe filtrar por patientId para paciente', async () => {
    repository.find.mockResolvedValueOnce([{ id: 'a1', patientId: 'p1' }]);

    const result = await service.findAll(patientRequester as any);

    expect(repository.find).toHaveBeenCalledWith({
      where: { patientId: 'p1' },
      order: { startAt: 'ASC' },
    });
    expect(result).toEqual([{ id: 'a1', patientId: 'p1' }]);
  });

  it('findOne debe regresar una cita si existe y pertenece al paciente', async () => {
    const appointment = makeAppointment();
    repository.findOne.mockResolvedValueOnce(appointment);

    const result = await service.findOne('a1', patientRequester as any);

    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'a1' } });
    expect(result).toEqual(appointment);
  });

  it('findOne debe fallar si la cita no existe', async () => {
    repository.findOne.mockResolvedValueOnce(null);

    await expect(service.findOne('a1', adminRequester as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('getAvailability debe marcar ocupado el slot empalmado', async () => {
    const qb = makeQb();

    qb.getMany.mockResolvedValueOnce([
      makeAppointment({
        id: 'a1',
        dentistId: 'd1',
        startAt: new Date('2026-04-21T10:00:00.000Z'),
        endAt: new Date('2026-04-21T11:00:00.000Z'),
        status: AppointmentStatus.CONFIRMED,
      }),
    ]);

    repository.createQueryBuilder.mockReturnValueOnce(qb);

    const result = await service.getAvailability(
      'd1',
      '2026-04-21',
      adminRequester as any,
    );

    expect(result.dentistId).toBe('d1');
    expect(result.date).toBe('2026-04-21');

    const slot10 = result.slots.find(
      (slot: any) => slot.startAt.toISOString() === '2026-04-21T10:00:00.000Z',
    );

    expect(slot10).toBeDefined();
    expect(slot10.available).toBe(false);
  });

  it('create debe guardar una cita válida con status PENDING', async () => {
    const dto = {
      patientId: 'p1',
      dentistId: 'd1',
      startAt: '2026-04-22T10:00:00.000Z',
      endAt: '2026-04-22T11:00:00.000Z',
      reason: 'Limpieza',
      notes: 'N/A',
    };

    const qb = makeQb();
    qb.getOne.mockResolvedValueOnce(null);

    repository.createQueryBuilder.mockReturnValueOnce(qb);
    repository.create.mockImplementation((data: any) => data);
    repository.save.mockImplementation(async (data: any) => ({
      id: 'a1',
      ...data,
    }));

    const result = await service.create(dto as any, patientRequester as any);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'p1',
        dentistId: 'd1',
        reason: 'Limpieza',
        notes: 'N/A',
        status: AppointmentStatus.PENDING,
      }),
    );

    expect(eventsPublisher.publishAppointmentCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 'a1',
        patientId: 'p1',
        dentistId: 'd1',
        status: AppointmentStatus.PENDING,
      }),
    );

    expect(reportsClient.sendAppointmentSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        appointment_id: 'a1',
        patient_id: 'p1',
        doctor_id: 'd1',
        status: 'scheduled',
        duration_minutes: 60,
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'a1',
        patientId: 'p1',
        dentistId: 'd1',
        status: AppointmentStatus.PENDING,
      }),
    );
  });

  it('create debe lanzar error si el paciente intenta crear para otro paciente', async () => {
    const dto = {
      patientId: 'p2',
      dentistId: 'd1',
      startAt: '2026-04-22T10:00:00.000Z',
      endAt: '2026-04-22T11:00:00.000Z',
    };

    await expect(
      service.create(dto as any, patientRequester as any),
    ).rejects.toThrow(ForbiddenException);

    expect(reportsClient.sendAppointmentSnapshot).not.toHaveBeenCalled();
  });

  it('create debe lanzar error si el rango es inválido', async () => {
    const dto = {
      patientId: 'p1',
      dentistId: 'd1',
      startAt: '2026-04-22T11:00:00.000Z',
      endAt: '2026-04-22T10:00:00.000Z',
    };

    await expect(
      service.create(dto as any, patientRequester as any),
    ).rejects.toThrow(BadRequestException);

    expect(reportsClient.sendAppointmentSnapshot).not.toHaveBeenCalled();
  });

  it('create debe lanzar error si existe empalme', async () => {
    const dto = {
      patientId: 'p1',
      dentistId: 'd1',
      startAt: '2026-04-22T10:00:00.000Z',
      endAt: '2026-04-22T11:00:00.000Z',
    };

    const qb = makeQb();
    qb.getOne.mockResolvedValueOnce({ id: 'a-existing' });

    repository.createQueryBuilder.mockReturnValueOnce(qb);

    await expect(
      service.create(dto as any, patientRequester as any),
    ).rejects.toThrow(BadRequestException);

    expect(reportsClient.sendAppointmentSnapshot).not.toHaveBeenCalled();
  });

  it('reschedule debe actualizar horario y regresar a PENDING', async () => {
    const appointment = makeAppointment({
      status: AppointmentStatus.CONFIRMED,
    });

    const dto = {
      startAt: '2026-04-22T12:00:00.000Z',
      endAt: '2026-04-22T13:00:00.000Z',
    };

    repository.findOne.mockResolvedValueOnce(appointment);

    const qb = makeQb();
    qb.getOne.mockResolvedValueOnce(null);

    repository.createQueryBuilder.mockReturnValueOnce(qb);
    repository.save.mockImplementation(async (data: any) => data);

    const result = await service.reschedule(
      'a1',
      dto as any,
      patientRequester as any,
    );

    expect(result.status).toBe(AppointmentStatus.PENDING);
    expect(result.startAt).toEqual(new Date(dto.startAt));
    expect(result.endAt).toEqual(new Date(dto.endAt));

    expect(reportsClient.sendAppointmentSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        appointment_id: 'a1',
        doctor_id: 'd1',
        patient_id: 'p1',
        status: 'scheduled',
        duration_minutes: 60,
      }),
    );
  });

  it('cancel debe cambiar status a CANCELLED', async () => {
    const appointment = makeAppointment({
      status: AppointmentStatus.PENDING,
    });

    repository.findOne.mockResolvedValueOnce(appointment);
    repository.save.mockImplementation(async (data: any) => data);

    const result = await service.cancel('a1', patientRequester as any);

    expect(result.status).toBe(AppointmentStatus.CANCELLED);

    expect(reportsClient.sendAppointmentSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        appointment_id: 'a1',
        doctor_id: 'd1',
        patient_id: 'p1',
        status: 'cancelled',
        duration_minutes: 60,
      }),
    );
  });

  it('confirm debe cambiar status a CONFIRMED', async () => {
    const appointment = makeAppointment({
      status: AppointmentStatus.PENDING,
    });

    repository.findOne.mockResolvedValueOnce(appointment);
    repository.save.mockImplementation(async (data: any) => data);

    const result = await service.confirm('a1', dentistRequester as any);

    expect(result.status).toBe(AppointmentStatus.CONFIRMED);

    expect(reportsClient.sendAppointmentSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        appointment_id: 'a1',
        doctor_id: 'd1',
        patient_id: 'p1',
        status: 'confirmed',
        duration_minutes: 60,
      }),
    );
  });

  it('confirm debe fallar si la cita está cancelada', async () => {
    repository.findOne.mockResolvedValueOnce(
      makeAppointment({
        status: AppointmentStatus.CANCELLED,
      }),
    );

    await expect(
      service.confirm('a1', dentistRequester as any),
    ).rejects.toThrow(BadRequestException);

    expect(reportsClient.sendAppointmentSnapshot).not.toHaveBeenCalled();
  });

  it('complete debe cambiar status a COMPLETED', async () => {
    const appointment = makeAppointment({
      status: AppointmentStatus.CONFIRMED,
    });

    repository.findOne.mockResolvedValueOnce(appointment);
    repository.save.mockImplementation(async (data: any) => data);

    const result = await service.complete('a1', dentistRequester as any);

    expect(result.status).toBe(AppointmentStatus.COMPLETED);

    expect(reportsClient.sendAppointmentSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        appointment_id: 'a1',
        doctor_id: 'd1',
        patient_id: 'p1',
        status: 'completed',
        duration_minutes: 60,
      }),
    );
  });

  it('complete debe fallar si la cita está cancelada', async () => {
    repository.findOne.mockResolvedValueOnce(
      makeAppointment({
        status: AppointmentStatus.CANCELLED,
      }),
    );

    await expect(
      service.complete('a1', dentistRequester as any),
    ).rejects.toThrow(BadRequestException);

    expect(reportsClient.sendAppointmentSnapshot).not.toHaveBeenCalled();
  });
});