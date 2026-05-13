import { IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RescheduleAppointmentDto {
  @ApiProperty({
    example: '2026-06-01T11:00:00.000Z',
    description: 'Nueva fecha y hora de inicio de la cita en formato ISO 8601.',
  })
  @IsISO8601()
  startAt: string;

  @ApiProperty({
    example: '2026-06-01T11:30:00.000Z',
    description: 'Nueva fecha y hora de finalización de la cita en formato ISO 8601.',
  })
  @IsISO8601()
  endAt: string;
}