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
});