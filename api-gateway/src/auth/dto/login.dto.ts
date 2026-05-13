import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'paciente@dentia.test',
    description: 'Correo electrónico registrado.',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Password123',
    minLength: 6,
    description: 'Contraseña del usuario.',
  })
  @IsString()
  @MinLength(6)
  password!: string;
}