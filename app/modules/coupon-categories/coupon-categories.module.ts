import { CouponCategory } from '@/entities/coupon-category.entity';
import { CategoriesModule } from '@/modules/categories/categories.module';
import { CouponsModule } from '@/modules/coupons/coupons.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponCategoriesController } from './coupon-categories.controller';
import { CouponCategoriesService } from './coupon-categories.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CouponCategory]),
    CouponsModule,
    CategoriesModule,
  ],
  controllers: [CouponCategoriesController],
  providers: [CouponCategoriesService],
  exports: [CouponCategoriesService],
})
export class CouponCategoriesModule {}
