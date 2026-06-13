import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: 850 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    enum: ['CASH', 'CARD', 'TRANSFER', 'OTHER'],
    example: 'CARD',
  })
  @IsString()
  @IsIn(['CASH', 'CARD', 'TRANSFER', 'OTHER'])
  method: string;

  @ApiProperty({ example: 'Limpieza dental y aplicacion de fluor' })
  @IsString()
  @MaxLength(500)
  treatmentDescription: string;

  @ApiPropertyOptional({ example: 'Pago cubierto en una sola exhibicion' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ example: '2026-06-12T12:30:00' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
