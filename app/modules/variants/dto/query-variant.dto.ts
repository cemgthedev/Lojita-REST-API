import { PaginationDto } from '@/common/dtos/pagination.dto';
import { STATUS } from '@/common/enums/status.enum';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryVariantDto extends PaginationDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId?: number;

  @IsOptional()
  @IsEnum(STATUS)
  status?: STATUS;
}
