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
import { CreateCouponProductDto } from './dto/create-coupon-product.dto';
import { QueryCouponProductDto } from './dto/query-coupon-product.dto';
import { UpdateCouponProductDto } from './dto/update-coupon-product.dto';
import { CouponProductsService } from './coupon-products.service';

@Controller('coupon-products')
export class CouponProductsController {
  constructor(private readonly couponProductsService: CouponProductsService) {}

  @Post()
  create(@Body() couponProduct: CreateCouponProductDto) {
    return this.couponProductsService.create(couponProduct);
  }

  @Get()
  query(@Query() query: QueryCouponProductDto) {
    return this.couponProductsService.query(query);
  }

  @Get(':couponId/:productId')
  findOne(
    @Param('couponId', ParseIntPipe) couponId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.couponProductsService.findOne(couponId, productId);
  }

  @Patch(':couponId/:productId')
  update(
    @Param('couponId', ParseIntPipe) couponId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() couponProduct: UpdateCouponProductDto,
  ) {
    return this.couponProductsService.update(
      couponId,
      productId,
      couponProduct,
    );
  }

  @Delete(':couponId/:productId')
  remove(
    @Param('couponId', ParseIntPipe) couponId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.couponProductsService.remove(couponId, productId);
  }
}
