import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Archivo clínico a subir.',
  })
  file: any;

  @ApiProperty({
    example: 'p-123',
    description: 'ID de dominio del paciente propietario del archivo.',
  })
  @IsString()
  @MinLength(1)
  patientId: string;

  @ApiPropertyOptional({
    example: 'appointment-id',
    description: 'ID de la cita relacionada, si aplica.',
  })
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiProperty({
    example: 'radiografia',
    description: 'Tipo de archivo clínico.',
  })
  @IsString()
  @MinLength(1)
  type: string;
}