import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePrescriptionDto {
  @IsString()
  @IsNotEmpty()
  appointmentId!: string;

  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @IsString()
  @IsNotEmpty()
  dentistId!: string;

  @IsString()
  @IsNotEmpty()
  diagnosis!: string;

  @IsString()
  @IsNotEmpty()
  indications!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}