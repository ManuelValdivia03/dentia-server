import { IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({
    example: 'p-123',
    description: 'ID de dominio del paciente',
  })
  @IsString()
  @MinLength(1)
  patientId: string;

  @ApiProperty({
    example: 'd1',
    description: 'ID de dominio del dentista.',
  })
  @IsString()
  @MinLength(1)
  dentistId: string;

  @ApiProperty({
    example: '2026-06-01T10:00:00.000Z',
    description: 'Fecha y hora de inicio de la cita.',
  })
  @IsISO8601()
  startAt: string;

  @ApiProperty({
    example: '2026-06-01T10:30:00.000Z',
    description: 'Fecha y hora de finalización de la cita.',
  })
  @IsISO8601()
  endAt: string;

  @ApiPropertyOptional({
    example: 'Consulta general',
    description: 'Motivo de la cita.',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    example: 'Paciente con sensibilidad en encías',
    description: 'Notas adicionales.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}