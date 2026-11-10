import { PaginationDto } from '@/common/dtos/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class QueryCategoryDto extends PaginationDto {
  @IsString()
  @IsOptional()
  title!: string;
}
