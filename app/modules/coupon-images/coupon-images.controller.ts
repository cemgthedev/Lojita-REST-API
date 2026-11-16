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
import { CreateCouponImageDto } from './dto/create-coupon-image.dto';
import { QueryCouponImageDto } from './dto/query-coupon-image.dto';
import { UpdateCouponImageDto } from './dto/update-coupon-image.dto';
import { CouponImagesService } from './coupon-images.service';

@Controller('coupon-images')
export class CouponImagesController {
  constructor(private readonly couponImagesService: CouponImagesService) {}

  @Post()
  create(@Body() couponImage: CreateCouponImageDto) {
    return this.couponImagesService.create(couponImage);
  }

  @Get()
  query(@Query() query: QueryCouponImageDto) {
    return this.couponImagesService.query(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.couponImagesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() couponImage: UpdateCouponImageDto,
  ) {
    return this.couponImagesService.update(id, couponImage);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.couponImagesService.remove(id);
  }
}
