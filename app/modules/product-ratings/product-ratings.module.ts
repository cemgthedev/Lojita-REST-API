import { ProductRating } from '@/entities/product-rating.entity';
import { ProductsModule } from '@/modules/products/products.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductRatingsController } from './product-ratings.controller';
import { ProductRatingsService } from './product-ratings.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductRating]), ProductsModule],
  controllers: [ProductRatingsController],
  providers: [ProductRatingsService],
  exports: [ProductRatingsService],
})
export class ProductRatingsModule {}
