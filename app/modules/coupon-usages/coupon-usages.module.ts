import { CouponUsage } from '@/entities/coupon-usage.entity';
import { CouponsModule } from '@/modules/coupons/coupons.module';
import { OrdersModule } from '@/modules/orders/orders.module';
import { UsersModule } from '@/modules/users/users.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponUsagesController } from './coupon-usages.controller';
import { CouponUsagesService } from './coupon-usages.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CouponUsage]),
    CouponsModule,
    OrdersModule,
    UsersModule,
  ],
  controllers: [CouponUsagesController],
  providers: [CouponUsagesService],
  exports: [CouponUsagesService],
})
export class CouponUsagesModule {}
