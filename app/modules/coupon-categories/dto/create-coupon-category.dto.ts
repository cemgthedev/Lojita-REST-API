import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateCouponCategoryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  couponId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId!: number;
}
