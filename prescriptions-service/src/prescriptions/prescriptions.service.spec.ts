import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { PrescriptionsService } from './prescriptions.service';
import { Prescription } from './entities/prescription.entity';
import { PrescriptionStatus } from './enums/prescription-status.enum';
import { RequestUser, RequestUserRole } from './interfaces/request-user.interface';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { AppointmentsClient } from './appointments.client';

describe('PrescriptionsService', () => {
  let service: PrescriptionsService;
  let repository: jest.Mocked<Repository<Prescription>>;
  let appointmentsClient: jest.Mocked<AppointmentsClient>;

  const authHeader = 'Bearer test-token';

  const dentistRequester: RequestUser = {
    sub: 'u-dentist',
    role: RequestUserRole.DENTIST,
    domainId: 'd1',
    email: 'dentist@dentia.local',
  };

  const patientRequester: RequestUser = {
    sub: 'u-patient',
    role: RequestUserRole.PATIENT,
    domainId: 'p1',
    email: 'patient@dentia.local',
  };

  const adminRequester: RequestUser = {
    sub: 'u-admin',
    role: RequestUserRole.ADMIN,
    domainId: 'admin1',
    email: 'admin@dentia.local',
  };

  const dto: CreatePrescriptionDto = {
    appointmentId: 'appointment-1',
    patientId: 'p1',
    dentistId: 'd1',
    diagnosis: 'Gingivitis leve',
    indications: 'Cepillado tres veces al día',
    notes: 'Control en una semana',
  };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<Prescription>>;

    appointmentsClient = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<AppointmentsClient>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        PrescriptionsService,
        {
          provide: getRepositoryToken(Prescription),
          useValue: repository,
        },
        {
          provide: AppointmentsClient,
          useValue: appointmentsClient,
        },
      ],
    }).compile();

    service = moduleRef.get(PrescriptionsService);
  });

  it('should throw 403 when requester is patient', async () => {
    await expect(
      service.create(dto, patientRequester, authHeader),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(appointmentsClient.findOne).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw 400 when appointment is not completed', async () => {
    appointmentsClient.findOne.mockResolvedValue({
      id: dto.appointmentId,
      patientId: dto.patientId,
      dentistId: dto.dentistId,
      startAt: '2026-06-08T16:00:00',
      endAt: '2026-06-08T16:30:00',
      status: 'PENDING',
    });

    await expect(
      service.create(dto, dentistRequester, authHeader),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(appointmentsClient.findOne).toHaveBeenCalledWith(
      dto.appointmentId,
      authHeader,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw 400 when prescription patient does not match appointment patient', async () => {
    appointmentsClient.findOne.mockResolvedValue({
      id: dto.appointmentId,
      patientId: 'p2',
      dentistId: dto.dentistId,
      startAt: '2026-06-08T16:00:00',
      endAt: '2026-06-08T16:30:00',
      status: 'COMPLETED',
    });

    await expect(
      service.create(dto, dentistRequester, authHeader),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw 403 when prescription dentist does not match appointment dentist', async () => {
    appointmentsClient.findOne.mockResolvedValue({
      id: dto.appointmentId,
      patientId: dto.patientId,
      dentistId: 'd2',
      startAt: '2026-06-08T16:00:00',
      endAt: '2026-06-08T16:30:00',
      status: 'COMPLETED',
    });

    await expect(
      service.create(dto, adminRequester, authHeader),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw 400 when completed appointment already has active prescription', async () => {
    appointmentsClient.findOne.mockResolvedValue({
      id: dto.appointmentId,
      patientId: dto.patientId,
      dentistId: dto.dentistId,
      startAt: '2026-06-08T16:00:00',
      endAt: '2026-06-08T16:30:00',
      status: 'COMPLETED',
    });

    repository.findOne.mockResolvedValue({
      id: 'prescription-1',
      ...dto,
      status: PrescriptionStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Prescription);

    await expect(
      service.create(dto, dentistRequester, authHeader),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should create prescription when appointment is completed and data matches', async () => {
    appointmentsClient.findOne.mockResolvedValue({
      id: dto.appointmentId,
      patientId: dto.patientId,
      dentistId: dto.dentistId,
      startAt: '2026-06-08T16:00:00',
      endAt: '2026-06-08T16:30:00',
      status: 'COMPLETED',
    });

    repository.findOne.mockResolvedValue(null);

    const createdPrescription = {
      ...dto,
      status: PrescriptionStatus.ACTIVE,
    } as Prescription;

    const savedPrescription = {
      id: 'prescription-1',
      ...createdPrescription,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Prescription;

    repository.create.mockReturnValue(createdPrescription);
    repository.save.mockResolvedValue(savedPrescription);

    const result = await service.create(dto, dentistRequester, authHeader);

    expect(repository.create).toHaveBeenCalledWith({
      appointmentId: dto.appointmentId,
      patientId: dto.patientId,
      dentistId: dto.dentistId,
      diagnosis: dto.diagnosis,
      indications: dto.indications,
      notes: dto.notes,
      status: PrescriptionStatus.ACTIVE,
    });
    expect(repository.save).toHaveBeenCalledWith(createdPrescription);
    expect(result).toEqual(savedPrescription);
  });

  it('findAll debe filtrar recetas activas por paciente', async () => {
    repository.find.mockResolvedValue([
      {
        id: 'rx-1',
        appointmentId: 'appointment-1',
        patientId: 'p1',
        dentistId: 'd1',
        diagnosis: 'Dx',
        indications: 'Indicaciones',
        notes: null,
        status: PrescriptionStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Prescription,
    ]);

    const result = await service.findAll(patientRequester);

    expect(repository.find).toHaveBeenCalledWith({
      where: {
        status: PrescriptionStatus.ACTIVE,
        patientId: 'p1',
      },
      order: { createdAt: 'DESC' },
    });

    expect(result).toHaveLength(1);
    expect(result[0].patientId).toBe('p1');
  });

  it('findAll debe filtrar recetas activas por dentista', async () => {
    repository.find.mockResolvedValue([
      {
        id: 'rx-1',
        appointmentId: 'appointment-1',
        patientId: 'p1',
        dentistId: 'd1',
        diagnosis: 'Dx',
        indications: 'Indicaciones',
        notes: null,
        status: PrescriptionStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Prescription,
    ]);

    const result = await service.findAll(dentistRequester);

    expect(repository.find).toHaveBeenCalledWith({
      where: {
        status: PrescriptionStatus.ACTIVE,
        dentistId: 'd1',
      },
      order: { createdAt: 'DESC' },
    });

    expect(result).toHaveLength(1);
    expect(result[0].dentistId).toBe('d1');
  });

  it('findAll debe permitir admin sin filtrar por paciente o dentista', async () => {
    repository.find.mockResolvedValue([
      {
        id: 'rx-1',
        appointmentId: 'appointment-1',
        patientId: 'p1',
        dentistId: 'd1',
        diagnosis: 'Dx',
        indications: 'Indicaciones',
        notes: null,
        status: PrescriptionStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Prescription,
    ]);

    const result = await service.findAll(adminRequester);

    expect(repository.find).toHaveBeenCalledWith({
      where: {
        status: PrescriptionStatus.ACTIVE,
      },
      order: { createdAt: 'DESC' },
    });

    expect(result).toHaveLength(1);
  });

  it('findAll debe rechazar rol no permitido', async () => {
    await expect(
      service.findAll({
        sub: 'u-unknown',
        role: 'RECEPTIONIST' as any,
        domainId: 'r1',
        email: 'reception@dentia.local',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.find).not.toHaveBeenCalled();
  });

  it('findOne debe regresar receta si requester es admin', async () => {
    const prescription = {
      id: 'rx-1',
      appointmentId: 'appointment-1',
      patientId: 'p1',
      dentistId: 'd1',
      diagnosis: 'Dx',
      indications: 'Indicaciones',
      notes: null,
      status: PrescriptionStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Prescription;

    repository.findOne.mockResolvedValue(prescription);

    const result = await service.findOne('rx-1', adminRequester);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: {
        id: 'rx-1',
        status: PrescriptionStatus.ACTIVE,
      },
    });

    expect(result).toEqual(prescription);
  });

  it('findOne debe regresar receta si requester es paciente dueño', async () => {
    const prescription = {
      id: 'rx-1',
      appointmentId: 'appointment-1',
      patientId: 'p1',
      dentistId: 'd1',
      diagnosis: 'Dx',
      indications: 'Indicaciones',
      notes: null,
      status: PrescriptionStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Prescription;

    repository.findOne.mockResolvedValue(prescription);

    const result = await service.findOne('rx-1', patientRequester);

    expect(result).toEqual(prescription);
  });

  it('findOne debe regresar receta si requester es dentista dueño', async () => {
    const prescription = {
      id: 'rx-1',
      appointmentId: 'appointment-1',
      patientId: 'p1',
      dentistId: 'd1',
      diagnosis: 'Dx',
      indications: 'Indicaciones',
      notes: null,
      status: PrescriptionStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Prescription;

    repository.findOne.mockResolvedValue(prescription);

    const result = await service.findOne('rx-1', dentistRequester);

    expect(result).toEqual(prescription);
  });

  it('findOne debe lanzar error si la receta no existe', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne('rx-missing', adminRequester)).rejects.toThrow(
      'Receta no encontrada',
    );
  });

  it('findOne debe rechazar paciente ajeno', async () => {
    repository.findOne.mockResolvedValue({
      id: 'rx-1',
      appointmentId: 'appointment-1',
      patientId: 'p2',
      dentistId: 'd1',
      diagnosis: 'Dx',
      indications: 'Indicaciones',
      notes: null,
      status: PrescriptionStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Prescription);

    await expect(service.findOne('rx-1', patientRequester)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('findOne debe rechazar dentista ajeno', async () => {
    repository.findOne.mockResolvedValue({
      id: 'rx-1',
      appointmentId: 'appointment-1',
      patientId: 'p1',
      dentistId: 'd2',
      diagnosis: 'Dx',
      indications: 'Indicaciones',
      notes: null,
      status: PrescriptionStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Prescription);

    await expect(service.findOne('rx-1', dentistRequester)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('findByAppointment debe regresar solo recetas visibles para el paciente', async () => {
    repository.find.mockResolvedValue([
      {
        id: 'rx-1',
        appointmentId: 'appointment-1',
        patientId: 'p1',
        dentistId: 'd1',
        diagnosis: 'Dx 1',
        indications: 'Indicaciones 1',
        notes: null,
        status: PrescriptionStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Prescription,
      {
        id: 'rx-2',
        appointmentId: 'appointment-1',
        patientId: 'p2',
        dentistId: 'd1',
        diagnosis: 'Dx 2',
        indications: 'Indicaciones 2',
        notes: null,
        status: PrescriptionStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Prescription,
    ]);

    const result = await service.findByAppointment(
      'appointment-1',
      patientRequester,
    );

    expect(repository.find).toHaveBeenCalledWith({
      where: {
        appointmentId: 'appointment-1',
        status: PrescriptionStatus.ACTIVE,
      },
      order: { createdAt: 'ASC' },
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rx-1');
    expect(result[0].patientId).toBe('p1');
  });

  it('generatePdf debe generar PDF si el paciente tiene acceso', async () => {
    repository.findOne.mockResolvedValue({
      id: 'rx-1',
      appointmentId: 'appointment-1',
      patientId: 'p1',
      dentistId: 'd1',
      diagnosis: 'Gingivitis leve',
      indications: 'Cepillado tres veces al dia',
      notes: 'Control en una semana',
      status: PrescriptionStatus.ACTIVE,
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      updatedAt: new Date('2026-06-01T10:00:00.000Z'),
    } as Prescription);

    const result = await service.generatePdf('rx-1', patientRequester);

    expect(result.filename).toBe('receta-rx-1.pdf');
    expect(result.contentType).toBe('application/pdf');
    expect(result.base64).toEqual(expect.any(String));
    expect(Buffer.from(result.base64, 'base64').length).toBeGreaterThan(0);
  });

  it('generatePdf debe rechazar si el paciente no tiene acceso a la receta', async () => {
    repository.findOne.mockResolvedValue({
      id: 'rx-1',
      appointmentId: 'appointment-1',
      patientId: 'p2',
      dentistId: 'd1',
      diagnosis: 'Dx',
      indications: 'Indicaciones',
      notes: null,
      status: PrescriptionStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Prescription);

    await expect(
      service.generatePdf('rx-1', patientRequester),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});