import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Prescription } from './entities/prescription.entity';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { PrescriptionStatus } from './enums/prescription-status.enum';
import { RequestUser, RequestUserRole } from './interfaces/request-user.interface';
import { generatePrescriptionPdf } from './pdf/prescription-pdf.generator';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionsRepository: Repository<Prescription>,
  ) {}

  async create(dto: CreatePrescriptionDto, requester: RequestUser) {
    if (
      requester.role !== RequestUserRole.DENTIST &&
      requester.role !== RequestUserRole.ADMIN
    ) {
      throw new ForbiddenException('No tienes permisos para crear recetas');
    }

    if (
      requester.role === RequestUserRole.DENTIST &&
      dto.dentistId !== requester.domainId
    ) {
      throw new ForbiddenException('No puedes crear recetas para otro dentista');
    }

    const existingPrescription = await this.prescriptionsRepository.findOne({
      where: {
        appointmentId: dto.appointmentId,
        status: PrescriptionStatus.ACTIVE,
      },
    });

    if (existingPrescription) {
      throw new BadRequestException('La cita ya tiene una receta activa');
    }

    const prescription = this.prescriptionsRepository.create({
      appointmentId: dto.appointmentId,
      patientId: dto.patientId,
      dentistId: dto.dentistId,
      diagnosis: dto.diagnosis,
      indications: dto.indications,
      notes: dto.notes,
      status: PrescriptionStatus.ACTIVE,
    });

    return this.prescriptionsRepository.save(prescription);
  }

  async findAll(requester: RequestUser) {
    const where: FindOptionsWhere<Prescription> = {
      status: PrescriptionStatus.ACTIVE,
    };

    if (requester.role === RequestUserRole.PATIENT) {
      where.patientId = requester.domainId;
    }

    if (requester.role === RequestUserRole.DENTIST) {
      where.dentistId = requester.domainId;
    }

    if (
      requester.role !== RequestUserRole.ADMIN &&
      requester.role !== RequestUserRole.PATIENT &&
      requester.role !== RequestUserRole.DENTIST
    ) {
      throw new ForbiddenException('No tienes permisos para ver recetas');
    }

    return this.prescriptionsRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, requester: RequestUser) {
    const prescription = await this.prescriptionsRepository.findOne({
      where: { id, status: PrescriptionStatus.ACTIVE },
    });

    if (!prescription) {
      throw new NotFoundException('Receta no encontrada');
    }

    this.ensureCanViewPrescription(prescription, requester);
    return prescription;
  }

  async generatePdf(id: string, requester: RequestUser) {
    const prescription = await this.findOne(id, requester);

    return generatePrescriptionPdf(prescription);
  }

  async findByAppointment(appointmentId: string, requester: RequestUser) {
    const prescriptions = await this.prescriptionsRepository.find({
      where: {
        appointmentId,
        status: PrescriptionStatus.ACTIVE,
      },
      order: { createdAt: 'ASC' },
    });

    return prescriptions.filter((prescription) => {
      try {
        this.ensureCanViewPrescription(prescription, requester);
        return true;
      } catch {
        return false;
      }
    });
  }

  private ensureCanViewPrescription(
    prescription: Prescription,
    requester: RequestUser,
  ) {
    if (requester.role === RequestUserRole.ADMIN) {
      return;
    }

    if (
      requester.role === RequestUserRole.PATIENT &&
      prescription.patientId === requester.domainId
    ) {
      return;
    }

    if (
      requester.role === RequestUserRole.DENTIST &&
      prescription.dentistId === requester.domainId
    ) {
      return;
    }

    throw new ForbiddenException('No tienes permisos para ver esta receta');
  }
}