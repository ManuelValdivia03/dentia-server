import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateClinicalRecordDto {
  @ApiPropertyOptional({ example: 'O+' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodType?: string;

  @ApiPropertyOptional({ example: 'Penicilina' })
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional({ example: 'Ninguna' })
  @IsOptional()
  @IsString()
  chronicDiseases?: string;

  @ApiPropertyOptional({ example: 'Ibuprofeno ocasional' })
  @IsOptional()
  @IsString()
  currentMedications?: string;

  @ApiPropertyOptional({ example: 'Sin cirugías relevantes' })
  @IsOptional()
  @IsString()
  surgicalHistory?: string;

  @ApiPropertyOptional({ example: 'Diabetes en familiares directos' })
  @IsOptional()
  @IsString()
  familyHistory?: string;

  @ApiPropertyOptional({ example: 'Ortodoncia previa' })
  @IsOptional()
  @IsString()
  dentalHistory?: string;

  @ApiPropertyOptional({ example: 'Paciente ansioso durante consulta' })
  @IsOptional()
  @IsString()
  riskNotes?: string;
}