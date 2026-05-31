import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePrescriptionDto {
  @ApiProperty({
    example: 'appointment_123',
    description: 'ID de la cita asociada a la receta',
  })
  @IsString()
  @IsNotEmpty()
  appointmentId!: string;

  @ApiProperty({
    example: 'patient_123',
    description: 'ID del paciente',
  })
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty({
    example: 'patient_123',
    description: 'ID del dentista',
  })
  @IsString()
  @IsNotEmpty()
  dentistId!: string;

  @ApiProperty({
    example: 'Caries dental leve',
    description: 'Diagnóstico clínico registrado por el dentista',
  })
  @IsString()
  @IsNotEmpty()
  diagnosis!: string;

  @ApiProperty({
    example: 'Cepillarse los dientes despues de cada comida',
    description: 'Indicaciones del diagnóstico registrado por el dentista',
  })
  @IsString()
  @IsNotEmpty()
  indications!: string;

  @ApiPropertyOptional({
    example: 'Evitar alimentos muy fríos y regresar si el dolor continúa.',
    description: 'Notas adicionales para el paciente',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}