import { IsMongoId, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListMessagesQueryDto {
  @IsOptional()
  @IsMongoId()
  before?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 30;
}