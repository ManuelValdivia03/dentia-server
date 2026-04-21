import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentStatus } from './enums/appointment-status.enum';

const createQueryBuilderMock = ({
  one = null,
  many = [],
}: {
  one?: any;
  many?: any[];
} = {}) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(one),
  getMany: jest.fn().mockResolvedValue(many),
});

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let repository: any;

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    service = new AppointmentsService(repository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll debe regresar citas ordenadas por startAt ASC', async () => {
    const appointments = [{ id: 'a1' }, { id: 'a2' }];
    repository.find.mockResolvedValueOnce(appointments);

    const result = await service.findAll();

    expect(repository.find).toHaveBeenCalledWith({
      order: { startAt: 'ASC' },
    });
    expect(result).toEqual(appointments);
  });

  it('findOne debe regresar una cita si existe', async () => {
    const appointment = { id: 'a1' };
    repository.findOne.mockResolvedValueOnce(appointment);

    const result = await service.findOne('a1');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'a1' },
    });
    expect(result).toEqual(appointment);
  });

  it('findOne debe lanzar NotFoundException si no existe', async () => {
    repository.findOne.mockResolvedValueOnce(null);

    await expect(service.findOne('a1')).rejects.toThrow(NotFoundException);
  });

  it('getAvailability debe lanzar error si faltan parámetros', async () => {
    await expect(service.getAvailability('', '2026-04-21')).rejects.toThrow(
      BadRequestException,
    );

    await expect(service.getAvailability('d1', '')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('getAvailability debe marcar ocupado el slot empalmado', async () => {
    const qb = createQueryBuilderMock({
      many: [
        {
          id: 'a1',
          dentistId: 'd1',
          startAt: new Date('2026-04-21T10:00:00.000Z'),
          endAt: new Date('2026-04-21T11:00:00.000Z'),
          status: AppointmentStatus.PENDING,
        },
      ],
    });

    repository.createQueryBuilder.mockReturnValueOnce(qb);

    const result = await service.getAvailability('d1', '2026-04-21');

    expect(result.dentistId).toBe('d1');
    expect(result.date).toBe('2026-04-21');
    expect(result.slots).toHaveLength(8);
    expect(result.slots[1]).toEqual({
      startAt: new Date('2026-04-21T10:00:00.000Z'),
      endAt: new Date('2026-04-21T11:00:00.000Z'),
      available: false,
    });
    expect(result.slots[0].available).toBe(true);
    expect(result.slots[2].available).toBe(true);
  });

  it('create debe guardar una cita válida con status PENDING', async () => {
    const dto = {
      patientId: 'p1',
      dentistId: 'd1',
      startAt: '2026-04-22T10:00:00.000Z',
      endAt: '2026-04-22T11:00:00.000Z',
      reason: 'Limpieza',
      notes: 'nota',
    };

    const qb = createQueryBuilderMock({ one: null });
    repository.createQueryBuilder.mockReturnValueOnce(qb);
    repository.create.mockImplementation((data: any) => data);
    repository.save.mockImplementation(async (data: any) => ({
      id: 'a1',
      ...data,
    }));

    const result = await service.create(dto);

    expect(repository.create).toHaveBeenCalledWith({
      patientId: 'p1',
      dentistId: 'd1',
      startAt: new Date('2026-04-22T10:00:00.000Z'),
      endAt: new Date('2026-04-22T11:00:00.000Z'),
      reason: 'Limpieza',
      notes: 'nota',
      status: AppointmentStatus.PENDING,
    });
    expect(result.status).toBe(AppointmentStatus.PENDING);
    expect(result.id).toBe('a1');
  });

  it('create debe lanzar error si el rango es inválido', async () => {
    const dto = {
      patientId: 'p1',
      dentistId: 'd1',
      startAt: '2026-04-22T11:00:00.000Z',
      endAt: '2026-04-22T10:00:00.000Z',
    };

    await expect(service.create(dto as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('create debe lanzar error si existe empalme', async () => {
    const dto = {
      patientId: 'p1',
      dentistId: 'd1',
      startAt: '2026-04-22T10:00:00.000Z',
      endAt: '2026-04-22T11:00:00.000Z',
    };

    const qb = createQueryBuilderMock({
      one: { id: 'existing-appointment' },
    });
    repository.createQueryBuilder.mockReturnValueOnce(qb);

    await expect(service.create(dto as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('reschedule debe actualizar horario y regresar a PENDING', async () => {
    const currentAppointment = {
      id: 'a1',
      patientId: 'p1',
      dentistId: 'd1',
      startAt: new Date('2026-04-22T10:00:00.000Z'),
      endAt: new Date('2026-04-22T11:00:00.000Z'),
      status: AppointmentStatus.CONFIRMED,
    };

    repository.findOne.mockResolvedValueOnce(currentAppointment);

    const qb = createQueryBuilderMock({ one: null });
    repository.createQueryBuilder.mockReturnValueOnce(qb);
    repository.save.mockImplementation(async (data: any) => data);

    const result = await service.reschedule('a1', {
      startAt: '2026-04-22T12:00:00.000Z',
      endAt: '2026-04-22T13:00:00.000Z',
    });

    expect(result.startAt).toEqual(new Date('2026-04-22T12:00:00.000Z'));
    expect(result.endAt).toEqual(new Date('2026-04-22T13:00:00.000Z'));
    expect(result.status).toBe(AppointmentStatus.PENDING);
  });

  it('cancel debe cambiar status a CANCELLED', async () => {
    const appointment = {
      id: 'a1',
      status: AppointmentStatus.PENDING,
    };

    repository.findOne.mockResolvedValueOnce(appointment);
    repository.save.mockImplementation(async (data: any) => data);

    const result = await service.cancel('a1');

    expect(result.status).toBe(AppointmentStatus.CANCELLED);
  });

  it('confirm debe cambiar status a CONFIRMED', async () => {
    const appointment = {
      id: 'a1',
      status: AppointmentStatus.PENDING,
    };

    repository.findOne.mockResolvedValueOnce(appointment);
    repository.save.mockImplementation(async (data: any) => data);

    const result = await service.confirm('a1');

    expect(result.status).toBe(AppointmentStatus.CONFIRMED);
  });

  it('confirm debe fallar si la cita está cancelada', async () => {
    repository.findOne.mockResolvedValueOnce({
      id: 'a1',
      status: AppointmentStatus.CANCELLED,
    });

    await expect(service.confirm('a1')).rejects.toThrow(BadRequestException);
  });

  it('complete debe cambiar status a COMPLETED', async () => {
    const appointment = {
      id: 'a1',
      status: AppointmentStatus.CONFIRMED,
    };

    repository.findOne.mockResolvedValueOnce(appointment);
    repository.save.mockImplementation(async (data: any) => data);

    const result = await service.complete('a1');

    expect(result.status).toBe(AppointmentStatus.COMPLETED);
  });

  it('complete debe fallar si la cita está cancelada', async () => {
    repository.findOne.mockResolvedValueOnce({
      id: 'a1',
      status: AppointmentStatus.CANCELLED,
    });

    await expect(service.complete('a1')).rejects.toThrow(BadRequestException);
  });
});