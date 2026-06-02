import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'paciente@test.com',
    description: 'Correo electronico de la cuenta a recuperar',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'Codigo de recuperacion de 6 digitos enviado al correo',
    pattern: '^\\d{6}$',
  })
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'El codigo debe tener exactamente 6 digitos',
  })
  code!: string;

  @ApiProperty({
    example: 'Password123!',
    description:
      'Nueva contrasena con minimo 8 caracteres, una mayuscula, una minuscula y un numero',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'La contrasena debe incluir mayuscula, minuscula y al menos un numero',
  })
  password!: string;
}
