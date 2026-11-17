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
import { CreateProductRatingDto } from './dto/create-product-rating.dto';
import { QueryProductRatingDto } from './dto/query-product-rating.dto';
import { UpdateProductRatingDto } from './dto/update-product-rating.dto';
import { ProductRatingsService } from './product-ratings.service';

@Controller('product-ratings')
export class ProductRatingsController {
  constructor(private readonly productRatingsService: ProductRatingsService) {}

  @Post()
  create(@Body() productRating: CreateProductRatingDto) {
    return this.productRatingsService.create(productRating);
  }

  @Get()
  query(@Query() query: QueryProductRatingDto) {
    return this.productRatingsService.query(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productRatingsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() productRating: UpdateProductRatingDto,
  ) {
    return this.productRatingsService.update(id, productRating);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productRatingsService.remove(id);
  }
}
