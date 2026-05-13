import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({
    example: 'p-123',
    description: 'ID de dominio del paciente.',
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
}