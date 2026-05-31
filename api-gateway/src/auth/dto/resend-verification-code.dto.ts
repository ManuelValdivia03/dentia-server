import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendVerificationCodeDto {
  @ApiProperty({
    example: 'paciente@test.com',
    description: 'Correo electrónico al que se reenviará el código de verificación.',
  })
  @IsEmail()
  email!: string;
}
