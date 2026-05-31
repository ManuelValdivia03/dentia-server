import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'paciente@test.com',
    description: 'Correo electrónico del usuario a verificar.',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'Código de verificación de 6 dígitos enviado al correo.',
    pattern: '^\\d{6}$',
  })
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'El código debe tener exactamente 6 dígitos',
  })
  code!: string;
}
