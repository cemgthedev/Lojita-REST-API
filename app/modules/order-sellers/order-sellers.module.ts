import { OrderSeller } from '@/entities/order-seller.entity';
import { OrdersModule } from '@/modules/orders/orders.module';
import { StoresModule } from '@/modules/stores/stores.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderSellersController } from './order-sellers.controller';
import { OrderSellersService } from './order-sellers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderSeller]),
    OrdersModule,
    StoresModule,
  ],
  controllers: [OrderSellersController],
  providers: [OrderSellersService],
  exports: [OrderSellersService],
})
export class OrderSellersModule {}
