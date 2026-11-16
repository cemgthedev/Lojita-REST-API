import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateCouponProductDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  couponId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number;
}
