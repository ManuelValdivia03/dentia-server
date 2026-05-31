import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePrescriptionDto {
  @ApiProperty({ example: 'appointment_123' })
  @IsString()
  @IsNotEmpty()
  appointmentId!: string;

  @ApiProperty({ example: 'patient_123' })
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty({ example: 'dentist_123' })
  @IsString()
  @IsNotEmpty()
  dentistId!: string;

  @ApiProperty({ example: 'Caries dental leve' })
  @IsString()
  @IsNotEmpty()
  diagnosis!: string;

  @ApiProperty({ example: 'Ibuprofeno 400mg cada 8 horas por 3 días.' })
  @IsString()
  @IsNotEmpty()
  indications!: string;

  @ApiPropertyOptional({
    example: 'Evitar alimentos muy fríos y regresar si hay dolor persistente.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
