import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadFileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  patientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  appointmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  prescriptionId?: string;
}