import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateClinicalRecordDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodType?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  chronicDiseases?: string;

  @IsOptional()
  @IsString()
  currentMedications?: string;

  @IsOptional()
  @IsString()
  surgicalHistory?: string;

  @IsOptional()
  @IsString()
  familyHistory?: string;

  @IsOptional()
  @IsString()
  dentalHistory?: string;

  @IsOptional()
  @IsString()
  riskNotes?: string;
}