import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'paciente@dentia.test',
    description: 'Correo electrónico del usuario.',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Password123',
    minLength: 8,
    description: 'Contraseña del usuario.',
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    example: 'Paciente Dentia',
    minLength: 3,
    description: 'Nombre completo del usuario.',
  })
  @IsString()
  @MinLength(3)
  fullName!: string;
}
