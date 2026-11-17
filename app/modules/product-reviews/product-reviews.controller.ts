import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { QueryProductReviewDto } from './dto/query-product-review.dto';
import { UpdateProductReviewDto } from './dto/update-product-review.dto';
import { ProductReviewsService } from './product-reviews.service';

@Controller('product-reviews')
export class ProductReviewsController {
  constructor(private readonly productReviewsService: ProductReviewsService) {}

  @Post()
  create(@Body() productReview: CreateProductReviewDto) {
    return this.productReviewsService.create(productReview);
  }

  @Get()
  query(@Query() query: QueryProductReviewDto) {
    return this.productReviewsService.query(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productReviewsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() productReview: UpdateProductReviewDto,
  ) {
    return this.productReviewsService.update(id, productReview);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productReviewsService.remove(id);
  }
}
