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

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto {
  @IsEmail()
  @Transform(trim)
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'La contraseña debe incluir mayúscula, minúscula y al menos un número',
  })
  password!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.'\-\s]+$/, {
    message: 'El nombre solo puede contener letras y espacios',
  })
  @Transform(trim)
  fullName!: string;

  @IsOptional()
  @IsIn(['PATIENT', 'DENTIST'], {
    message: 'El rol de registro solo puede ser PATIENT o DENTIST',
  })
  role?: 'PATIENT' | 'DENTIST';

  // Campos obligatorios solo para dentistas.
  @ValidateIf((o: RegisterDto) => o.role === 'DENTIST')
  @IsString()
  @Matches(/^\d{7,8}$/, {
    message: 'La cédula profesional debe tener 7 u 8 dígitos numéricos',
  })
  @Transform(trim)
  cedulaProfesional?: string;

  @ValidateIf((o: RegisterDto) => o.role === 'DENTIST')
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9.,&'\-\s]+$/, {
    message: 'La escuela contiene caracteres no permitidos',
  })
  @Transform(trim)
  escuela?: string;

  @ValidateIf((o: RegisterDto) => o.role === 'DENTIST')
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  @Transform(trim)
  descripcion?: string;
}
