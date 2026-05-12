import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ClinicalFile,
  ClinicalFileDocument,
} from './schemas/clinical-file.schema';
import { UploadFileDto } from './dto/upload-file.dto';
import { ListFilesQueryDto } from './dto/list-files-query.dto';
import { CurrentUser } from './current-user.interface';
import { LocalStorageService } from './storage/local-storage.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(ClinicalFile.name)
    private readonly clinicalFileModel: Model<ClinicalFileDocument>,
    private readonly storage: LocalStorageService,
  ) {}

  async upload(
    file: Express.Multer.File | undefined,
    dto: UploadFileDto,
    user: CurrentUser,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo requerido');
    }

    this.validateFile(file);

    const patientId = this.resolvePatientId(dto, user);

    const stored = await this.storage.save(file);

    const created = await this.clinicalFileModel.create({
      originalName: file.originalname,
      storedName: stored.storedName,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: stored.storagePath,
      patientId,
      appointmentId: dto.appointmentId,
      prescriptionId: dto.prescriptionId,
      uploadedBy: user.id,
      uploadedByRole: user.role,
      deletedAt: null,
    });

    return this.toResponse(created);
  }

  async findAll(query: ListFilesQueryDto, user: CurrentUser) {
    const filter: Record<string, unknown> = {
      deletedAt: null,
    };

    if (query.appointmentId) {
      filter.appointmentId = query.appointmentId;
    }

    if (query.prescriptionId) {
      filter.prescriptionId = query.prescriptionId;
    }

    if (user.role === 'ADMIN') {
      if (query.patientId) {
        filter.patientId = query.patientId;
      }
    }

    if (user.role === 'PATIENT') {
      filter.patientId = user.id;
    }

    if (user.role === 'DENTIST') {
      // Recorte MVP seguro:
      // El dentista solo ve archivos que él subió.
      // Validar pacientes atendidos requiere consultar appointments-service.
      filter.uploadedBy = user.id;

      if (query.patientId) {
        filter.patientId = query.patientId;
      }
    }

    const files = await this.clinicalFileModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();

    return files.map((file) => this.toResponse(file));
  }

  async findOne(id: string, user: CurrentUser) {
    const file = await this.findActiveById(id);
    this.assertCanAccess(file, user);
    return this.toResponse(file);
  }

  async download(id: string, user: CurrentUser) {
    const file = await this.findActiveById(id);
    this.assertCanAccess(file, user);

    return {
      file: this.toResponse(file),
      stream: this.storage.createReadStream(file.storagePath),
    };
  }

  async remove(id: string, user: CurrentUser) {
    const file = await this.findActiveById(id);

    const canDelete = user.role === 'ADMIN' || file.uploadedBy === user.id;

    if (!canDelete) {
      throw new ForbiddenException('No autorizado para eliminar este archivo');
    }

    await this.storage.delete(file.storagePath);

    file.deletedAt = new Date();
    await file.save();

    return {
      deleted: true,
      id: file.id,
    };
  }

  private validateFile(file: Express.Multer.File) {
    const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB ?? 10);
    const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de archivo no permitido. Solo JPG, PNG o PDF.',
      );
    }

    if (file.size > maxFileSizeBytes) {
      throw new BadRequestException(
        `El archivo excede el límite de ${maxFileSizeMb}MB`,
      );
    }
  }

  private resolvePatientId(dto: UploadFileDto, user: CurrentUser) {
    if (user.role === 'PATIENT') {
      return user.id;
    }

    if (!dto.patientId) {
      throw new BadRequestException('patientId requerido');
    }

    return dto.patientId;
  }

  private async findActiveById(id: string) {
    const file = await this.clinicalFileModel
      .findOne({
        _id: id,
        deletedAt: null,
      })
      .exec();

    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }

    return file;
  }

  private assertCanAccess(file: ClinicalFileDocument, user: CurrentUser) {
    if (user.role === 'ADMIN') {
      return;
    }

    if (user.role === 'PATIENT' && file.patientId === user.id) {
      return;
    }

    if (user.role === 'DENTIST' && file.uploadedBy === user.id) {
      return;
    }

    throw new ForbiddenException('No autorizado para acceder a este archivo');
  }

  private toResponse(file: ClinicalFileDocument) {
    return {
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      patientId: file.patientId,
      appointmentId: file.appointmentId,
      prescriptionId: file.prescriptionId,
      uploadedBy: file.uploadedBy,
      uploadedByRole: file.uploadedByRole,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }
}