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
import { CreateCouponCategoryDto } from './dto/create-coupon-category.dto';
import { QueryCouponCategoryDto } from './dto/query-coupon-category.dto';
import { UpdateCouponCategoryDto } from './dto/update-coupon-category.dto';
import { CouponCategoriesService } from './coupon-categories.service';

@Controller('coupon-categories')
export class CouponCategoriesController {
  constructor(
    private readonly couponCategoriesService: CouponCategoriesService,
  ) {}

  @Post()
  create(@Body() couponCategory: CreateCouponCategoryDto) {
    return this.couponCategoriesService.create(couponCategory);
  }

  @Get()
  query(@Query() query: QueryCouponCategoryDto) {
    return this.couponCategoriesService.query(query);
  }

  @Get(':couponId/:categoryId')
  findOne(
    @Param('couponId', ParseIntPipe) couponId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ) {
    return this.couponCategoriesService.findOne(couponId, categoryId);
  }

  @Patch(':couponId/:categoryId')
  update(
    @Param('couponId', ParseIntPipe) couponId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() couponCategory: UpdateCouponCategoryDto,
  ) {
    return this.couponCategoriesService.update(
      couponId,
      categoryId,
      couponCategory,
    );
  }

  @Delete(':couponId/:categoryId')
  remove(
    @Param('couponId', ParseIntPipe) couponId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ) {
    return this.couponCategoriesService.remove(couponId, categoryId);
  }
}
