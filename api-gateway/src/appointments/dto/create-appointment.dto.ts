import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({
    example: 'patient_123',
    description:
      'ID de dominio del paciente. Para rol PATIENT el gateway lo sobrescribe con el usuario autenticado.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  patientId?: string;

  @ApiProperty({
    example: 'dentist_123',
    description: 'ID de dominio del dentista.',
  })
  @IsString()
  @MinLength(1)
  dentistId: string;

  @ApiProperty({
    example: '2026-06-01T16:00:00.000Z',
    description: 'Fecha/hora de inicio de la cita en formato ISO 8601.',
  })
  @IsISO8601()
  startAt: string;

  @ApiProperty({
    example: '2026-06-01T16:30:00.000Z',
    description: 'Fecha/hora de fin de la cita en formato ISO 8601.',
  })
  @IsISO8601()
  endAt: string;

  @ApiPropertyOptional({ example: 'Limpieza dental' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 'Paciente reporta sensibilidad dental.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
