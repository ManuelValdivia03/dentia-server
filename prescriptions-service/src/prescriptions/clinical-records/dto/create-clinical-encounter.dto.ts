import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateClinicalEncounterDto {
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsString()
  @IsNotEmpty()
  reasonForVisit!: string;

  @IsOptional()
  @IsString()
  arrivalDescription?: string;

  @IsOptional()
  @IsString()
  symptoms?: string;

  @IsString()
  @IsNotEmpty()
  diagnosis!: string;

  @IsOptional()
  @IsString()
  treatmentPerformed?: string;

  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsUUID()
  prescriptionId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileIds?: string[];
}