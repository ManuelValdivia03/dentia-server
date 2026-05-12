import { IsString, IsNotEmpty } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  dentistId: string;
}