import { PartialType } from '@nestjs/mapped-types';
import { CreateCouponCategoryDto } from './create-coupon-category.dto';

export class UpdateCouponCategoryDto extends PartialType(
  CreateCouponCategoryDto,
) {}
