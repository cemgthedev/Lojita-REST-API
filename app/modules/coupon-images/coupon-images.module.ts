import { CouponImage } from '@/entities/coupon-image.entity';
import { CouponsModule } from '@/modules/coupons/coupons.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponImagesController } from './coupon-images.controller';
import { CouponImagesService } from './coupon-images.service';

@Module({
  imports: [TypeOrmModule.forFeature([CouponImage]), CouponsModule],
  controllers: [CouponImagesController],
  providers: [CouponImagesService],
})
export class CouponImagesModule {}
