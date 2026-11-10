import { PaginationDto } from '@/common/dtos/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class QueryStoreDto extends PaginationDto {
  @IsString()
  @IsOptional()
  name?: string;
}
