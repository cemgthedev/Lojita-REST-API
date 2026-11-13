import { PaginationDto } from '@/common/dtos/pagination.dto';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryVariantImageDto extends PaginationDto {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId?: number;
}
