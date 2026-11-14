import { PaginationDto } from '@/common/dtos/pagination.dto';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class QueryOrderItemDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderSellerId?: number;
}
