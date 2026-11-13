import { Cart } from '@/entities/cart.entity';
import { UsersModule } from '@/modules/users/users.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cart]), UsersModule],
  controllers: [CartsController],
  providers: [CartsService],
})
export class CartsModule {}
