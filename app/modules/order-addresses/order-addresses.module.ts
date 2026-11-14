import { OrderAddress } from '@/entities/order-address.entity';
import { OrdersModule } from '@/modules/orders/orders.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderAddressesController } from './order-addresses.controller';
import { OrderAddressesService } from './order-addresses.service';

@Module({
  imports: [TypeOrmModule.forFeature([OrderAddress]), OrdersModule],
  controllers: [OrderAddressesController],
  providers: [OrderAddressesService],
})
export class OrderAddressesModule {}
