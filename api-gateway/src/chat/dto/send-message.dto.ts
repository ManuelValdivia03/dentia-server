import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    example: 'Hola doctor, tengo una duda sobre mi tratamiento.',
    description: 'Contenido del mensaje.',
  })
  @IsString()
  @MinLength(1)
  body: string;
}