import { OrderItem } from '@/entities/order-item.entity';
import { OrdersModule } from '@/modules/orders/orders.module';
import { UsersModule } from '@/modules/users/users.module';
import { VariantsModule } from '@/modules/variants/variants.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemsController } from './order-items.controller';
import { OrderItemsService } from './order-items.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderItem]),
    OrdersModule,
    VariantsModule,
    UsersModule,
  ],
  controllers: [OrderItemsController],
  providers: [OrderItemsService],
  exports: [OrderItemsService],
})
export class OrderItemsModule {}
