import { PaginationDto } from '@/common/dtos/pagination.dto';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class QueryMessageDto extends PaginationDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  chatId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  senderId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;
}
