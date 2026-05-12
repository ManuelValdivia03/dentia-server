import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ClinicalFileDocument = HydratedDocument<ClinicalFile>;

export type FileOwnerRole = 'ADMIN' | 'DENTIST' | 'PATIENT';

@Schema({
  collection: 'clinical_files',
  timestamps: true,
})
export class ClinicalFile {
  @Prop({ required: true })
  originalName!: string;

  @Prop({ required: true })
  storedName!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  size!: number;

  @Prop({ required: true })
  storagePath!: string;

  @Prop({ required: true, index: true })
  patientId!: string;

  @Prop({ required: false, index: true })
  appointmentId?: string;

  @Prop({ required: false, index: true })
  prescriptionId?: string;

  @Prop({ required: true, index: true })
  uploadedBy!: string;

  @Prop({ required: true, enum: ['ADMIN', 'DENTIST', 'PATIENT'] })
  uploadedByRole!: FileOwnerRole;

  @Prop({ type: Date, required: false, default: null })
  deletedAt?: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ClinicalFileSchema = SchemaFactory.createForClass(ClinicalFile);

ClinicalFileSchema.index({ patientId: 1, deletedAt: 1 });
ClinicalFileSchema.index({ uploadedBy: 1, deletedAt: 1 });