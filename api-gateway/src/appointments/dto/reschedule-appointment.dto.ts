import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class RescheduleAppointmentDto {
  @ApiProperty({
    example: '2026-06-02T17:00:00.000Z',
    description: 'Nueva fecha/hora de inicio en formato ISO 8601.',
  })
  @IsISO8601()
  startAt: string;

  @ApiProperty({
    example: '2026-06-02T17:30:00.000Z',
    description: 'Nueva fecha/hora de fin en formato ISO 8601.',
  })
  @IsISO8601()
  endAt: string;
}
