import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.'\-\s]+$/, {
    message: 'El nombre solo puede contener letras y espacios',
  })
  @Transform(trim)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9.,&'\-\s]+$/, {
    message: 'La especialidad contiene caracteres no permitidos',
  })
  @Transform(trim)
  specialty?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9.,&'\-\s]+$/, {
    message: 'La escuela contiene caracteres no permitidos',
  })
  @Transform(trim)
  escuela?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  @Transform(trim)
  descripcion?: string;
}
