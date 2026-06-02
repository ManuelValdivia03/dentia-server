import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({
    example: 'paciente@test.com',
    description: 'Correo electronico de la cuenta a recuperar',
  })
  @IsEmail()
  email!: string;
}
