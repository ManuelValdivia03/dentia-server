import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateClinicalEncounterDto {
  @ApiProperty({
    example: '36ebe3aa-5cea-4b11-aa19-5c58aca140a8',
    description: 'Cita usada para validar la relación clínica dentista-paciente.',
  })
  @IsUUID()
  appointmentId!: string;

  @ApiProperty({ example: 'Dolor en molar inferior derecho' })
  @IsString()
  @IsNotEmpty()
  reasonForVisit!: string;

  @ApiPropertyOptional({
    example: 'Paciente llega con dolor agudo y sensibilidad al frío',
  })
  @IsOptional()
  @IsString()
  arrivalDescription?: string;

  @ApiPropertyOptional({
    example: 'Dolor, inflamación leve, molestia al masticar',
  })
  @IsOptional()
  @IsString()
  symptoms?: string;

  @ApiProperty({ example: 'Caries profunda en molar inferior derecho' })
  @IsString()
  @IsNotEmpty()
  diagnosis!: string;

  @ApiPropertyOptional({
    example: 'Limpieza de zona afectada y restauración provisional',
  })
  @IsOptional()
  @IsString()
  treatmentPerformed?: string;

  @ApiPropertyOptional({ example: 'Endodoncia en próxima cita' })
  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @ApiPropertyOptional({ example: 'Se recomienda evitar alimentos duros' })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional({
    example: '0407598d-72ab-49e3-964d-d3d0aff2884e',
  })
  @IsOptional()
  @IsUUID()
  prescriptionId?: string;

  @ApiPropertyOptional({
    example: ['6a1601a0b603d145b246199e'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileIds?: string[];
}