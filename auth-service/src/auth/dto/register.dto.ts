import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(3)
  fullName!: string;

  @IsOptional()
  @IsIn(['PATIENT', 'DENTIST'], {
    message: 'El rol de registro solo puede ser PATIENT o DENTIST',
  })
  role?: 'PATIENT' | 'DENTIST';
}