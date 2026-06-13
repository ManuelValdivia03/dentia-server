import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicalRecord } from './entities/clinical-record.entity';
import { ClinicalEncounter } from './entities/clinical-encounter.entity';
import { UpdateClinicalRecordDto } from './dto/update-clinical-record.dto';
import { CreateClinicalEncounterDto } from './dto/create-clinical-encounter.dto';
import {
  RequestUser,
  RequestUserRole,
} from '../interfaces/request-user.interface';
import { AppointmentsClient } from '../appointments.client';

@Injectable()
export class ClinicalRecordsService {
  constructor(
    @InjectRepository(ClinicalRecord)
    private readonly recordsRepository: Repository<ClinicalRecord>,

    @InjectRepository(ClinicalEncounter)
    private readonly encountersRepository: Repository<ClinicalEncounter>,

    private readonly appointmentsClient: AppointmentsClient,
  ) {}

  async getPatientRecord(
    patientId: string,
    requester: RequestUser,
    dentistId?: string,
    authHeader?: string,
  ) {
    if (requester.role === RequestUserRole.PATIENT) {
      if (requester.domainId !== patientId) {
        throw new ForbiddenException(
          'No puedes consultar expediente de otro paciente',
        );
      }

      return this.findOrCreateRecord(patientId, dentistId);
    }

    if (requester.role === RequestUserRole.ADMIN) {
      return this.findOrCreateRecord(patientId, dentistId);
    }

    if (requester.role === RequestUserRole.DENTIST) {
      const canAccess = await this.canDentistAccessPatient(
        requester.domainId,
        patientId,
        authHeader,
      );

      if (!canAccess) {
        throw new ForbiddenException(
          'El dentista no tiene relación clínica con este paciente',
        );
      }

      return this.findOrCreateRecord(patientId, dentistId);
    }

    throw new ForbiddenException('No tienes permisos para consultar expedientes');
  }

  async updatePatientRecord(
    patientId: string,
    dto: UpdateClinicalRecordDto,
    requester: RequestUser,
    authHeader?: string,
  ) {
    if (requester.role !== RequestUserRole.DENTIST) {
      throw new ForbiddenException(
        'Solo dentistas pueden actualizar expedientes',
      );
    }

    const canAccess = await this.canDentistAccessPatient(
      requester.domainId,
      patientId,
      authHeader,
    );

    if (!canAccess) {
      throw new ForbiddenException(
        'No puedes actualizar expediente de un paciente sin relación clínica',
      );
    }

    const record = await this.findOrCreateRecordEntity(patientId);

    Object.assign(record, dto);

    return this.recordsRepository.save(record);
  }

  async createEncounter(
    patientId: string,
    dto: CreateClinicalEncounterDto,
    requester: RequestUser,
    authHeader?: string,
  ) {
    if (requester.role !== RequestUserRole.DENTIST) {
      throw new ForbiddenException(
        'Solo dentistas pueden registrar consultas clínicas',
      );
    }

    if (!dto.appointmentId) {
      throw new BadRequestException(
        'appointmentId es requerido para validar la relación clínica',
      );
    }

    if (!authHeader) {
      throw new ForbiddenException(
        'No se recibió autorización para validar la cita',
      );
    }

    const appointment = await this.appointmentsClient.findOne(
      dto.appointmentId,
      authHeader,
    );

    if (appointment.patientId !== patientId) {
      throw new BadRequestException(
        'La cita no pertenece al paciente indicado',
      );
    }

    if (appointment.dentistId !== requester.domainId) {
      throw new ForbiddenException(
        'La cita no pertenece al dentista autenticado',
      );
    }

    const existingEncounter = await this.encountersRepository.findOne({
      where: { appointmentId: dto.appointmentId },
    });

    if (existingEncounter) {
      throw new BadRequestException(
        'Ya existe una consulta clínica registrada para esta cita',
      );
    }

    const record = await this.findOrCreateRecordEntity(patientId);

    const encounter = this.encountersRepository.create({
      recordId: record.id,
      patientId,
      dentistId: requester.domainId,
      appointmentId: dto.appointmentId,
      reasonForVisit: dto.reasonForVisit,
      arrivalDescription: dto.arrivalDescription,
      symptoms: dto.symptoms,
      diagnosis: dto.diagnosis,
      treatmentPerformed: dto.treatmentPerformed,
      treatmentPlan: dto.treatmentPlan,
      observations: dto.observations,
      prescriptionId: dto.prescriptionId,
      fileIds: dto.fileIds ?? [],
      createdBy: requester.domainId,
    });

    return this.encountersRepository.save(encounter);
  }

  private async findOrCreateRecord(patientId: string, dentistId?: string) {
    const record = await this.findOrCreateRecordEntity(patientId);

    const encounters = await this.encountersRepository.find({
      where: dentistId ? { patientId, dentistId } : { patientId },
      order: { createdAt: 'DESC' },
    });

    return {
      ...record,
      encounters,
    };
  }

  private async findOrCreateRecordEntity(patientId: string) {
    const existingRecord = await this.recordsRepository.findOne({
      where: { patientId },
    });

    if (existingRecord) {
      return existingRecord;
    }

    const record = this.recordsRepository.create({
      patientId,
    });

    return this.recordsRepository.save(record);
  }

  private async canDentistAccessPatient(
    dentistId: string,
    patientId: string,
    authHeader?: string,
  ): Promise<boolean> {
    if (!authHeader) {
      throw new ForbiddenException(
        'No se recibió autorización para validar relación clínica',
      );
    }

    return this.appointmentsClient.hasDentistPatientRelation(
      dentistId,
      patientId,
      authHeader,
    );
  }
}