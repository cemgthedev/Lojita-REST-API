import { ProductReview } from '@/entities/product-review.entity';
import { ProductsModule } from '@/modules/products/products.module';
import { UsersModule } from '@/modules/users/users.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductReviewsController } from './product-reviews.controller';
import { ProductReviewsService } from './product-reviews.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductReview]),
    ProductsModule,
    UsersModule,
  ],
  controllers: [ProductReviewsController],
  providers: [ProductReviewsService],
  exports: [ProductReviewsService],
})
export class ProductReviewsModule {}
