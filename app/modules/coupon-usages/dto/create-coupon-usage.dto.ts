import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateCouponUsageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  couponId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId!: number;
}
