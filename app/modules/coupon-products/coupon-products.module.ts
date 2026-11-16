import { CouponProduct } from '@/entities/coupon-product.entity';
import { CouponsModule } from '@/modules/coupons/coupons.module';
import { ProductsModule } from '@/modules/products/products.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponProductsController } from './coupon-products.controller';
import { CouponProductsService } from './coupon-products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CouponProduct]),
    CouponsModule,
    ProductsModule,
  ],
  controllers: [CouponProductsController],
  providers: [CouponProductsService],
  exports: [CouponProductsService],
})
export class CouponProductsModule {}
