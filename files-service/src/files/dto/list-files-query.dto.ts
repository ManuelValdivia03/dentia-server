import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListFilesQueryDto {
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