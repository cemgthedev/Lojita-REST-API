import { Payment } from '@/entities/payment.entity';
import { OrdersModule } from '@/modules/orders/orders.module';
import { PaymentMethodsModule } from '@/modules/payment-methods/payment-methods.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    OrdersModule,
    PaymentMethodsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
