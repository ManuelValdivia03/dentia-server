import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePrescriptionDto {
  @ApiProperty({
    example: 'appointment-id',
    description: 'ID de la cita asociada a la receta.',
  })
  @IsString()
  @IsNotEmpty()
  appointmentId!: string;

  @ApiProperty({
    example: 'p-123',
    description: 'ID de dominio del paciente.',
  })
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty({
    example: 'd1',
    description: 'ID de dominio del dentista.',
  })
  @IsString()
  @IsNotEmpty()
  dentistId!: string;

  @ApiProperty({
    example: 'Caries dental leve en molar inferior.',
    description: 'Diagnóstico registrado por el dentista.',
  })
  @IsString()
  @IsNotEmpty()
  diagnosis!: string;

  @ApiProperty({
    example: 'Tomar analgésico cada 8 horas por 3 días y acudir a revisión.',
    description: 'Indicaciones clínicas para el paciente.',
  })
  @IsString()
  @IsNotEmpty()
  indications!: string;

  @ApiPropertyOptional({
    example: 'Evitar alimentos muy fríos durante 48 horas.',
    description: 'Notas adicionales de la receta.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}