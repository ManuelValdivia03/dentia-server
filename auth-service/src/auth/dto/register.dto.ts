import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UserRole {
  PATIENT = 'PATIENT',
  DENTIST = 'DENTIST',
  ADMIN = 'ADMIN',
}

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto {
  @ApiProperty({
    example: 'paciente@test.com',
    description: 'Correo electrónico del usuario',
  })
  @IsEmail()
  @Transform(trim)
  email!: string;

  @ApiProperty({
    example: 'Password123!',
    description:
      'Contraseña con mínimo 8 caracteres, una mayúscula, una minúscula y un número',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'La contraseña debe incluir mayúscula, minúscula y al menos un número',
  })
  password!: string;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre completo del usuario',
    minLength: 3,
    maxLength: 120,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.'\-\s]+$/, {
    message: 'El nombre solo puede contener letras y espacios',
  })
  @Transform(trim)
  fullName!: string;

  @ApiPropertyOptional({
    example: 'PATIENT',
    enum: ['PATIENT', 'DENTIST'],
    description:
      'Rol del usuario. Si no se envía, el registro se considera de paciente.',
  })
  @IsOptional()
  @IsIn(['PATIENT', 'DENTIST'], {
    message: 'El rol de registro solo puede ser PATIENT o DENTIST',
  })
  role?: 'PATIENT' | 'DENTIST';

  @ApiPropertyOptional({
    example: '12345678',
    description: 'Cédula profesional. Obligatoria solo si role es DENTIST.',
  })
  @ValidateIf((o: RegisterDto) => o.role === 'DENTIST')
  @IsString()
  @Matches(/^\d{7,8}$/, {
    message: 'La cédula profesional debe tener 7 u 8 dígitos numéricos',
  })
  @Transform(trim)
  cedulaProfesional?: string;

  @ApiPropertyOptional({
    example: 'Universidad Nacional Autónoma de México',
    description: 'Escuela de egreso. Obligatoria solo si role es DENTIST.',
  })
  @ValidateIf((o: RegisterDto) => o.role === 'DENTIST')
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9.,&'\-\s]+$/, {
    message: 'La escuela contiene caracteres no permitidos',
  })
  @Transform(trim)
  escuela?: string;

  @ApiPropertyOptional({
    example:
      'Cirujano dentista con experiencia en odontología general y atención preventiva.',
    description: 'Descripción profesional. Obligatoria solo si role es DENTIST.',
    minLength: 10,
    maxLength: 1000,
  })
  @ValidateIf((o: RegisterDto) => o.role === 'DENTIST')
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  @Transform(trim)
  descripcion?: string;
}