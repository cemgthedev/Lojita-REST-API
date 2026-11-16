import { PartialType } from '@nestjs/mapped-types';
import { CreateCouponImageDto } from './create-coupon-image.dto';

export class UpdateCouponImageDto extends PartialType(CreateCouponImageDto) {}
