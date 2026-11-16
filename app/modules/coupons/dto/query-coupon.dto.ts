import { PaginationDto } from '@/common/dtos/pagination.dto';
import { STATUS } from '@/common/enums/status.enum';
import { COUPON_SCOPE_TYPE } from '@/modules/coupons/enums/coupon-scope-type.enum';
import { COUPON_TYPE } from '@/modules/coupons/enums/coupon-type.enum';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryCouponDto extends PaginationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(COUPON_SCOPE_TYPE)
  scopeType?: COUPON_SCOPE_TYPE;

  @IsOptional()
  @IsEnum(COUPON_TYPE)
  type?: COUPON_TYPE;

  @IsOptional()
  @IsEnum(STATUS)
  status?: STATUS;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  storeId?: number;
}
