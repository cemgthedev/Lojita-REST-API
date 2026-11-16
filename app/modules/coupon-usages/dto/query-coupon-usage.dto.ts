import { PaginationDto } from '@/common/dtos/pagination.dto';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class QueryCouponUsageDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  couponId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId?: number;
}
