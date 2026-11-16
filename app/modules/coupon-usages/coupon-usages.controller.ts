import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CreateCouponUsageDto } from './dto/create-coupon-usage.dto';
import { QueryCouponUsageDto } from './dto/query-coupon-usage.dto';
import { CouponUsagesService } from './coupon-usages.service';

@Controller('coupon-usages')
export class CouponUsagesController {
  constructor(private readonly couponUsagesService: CouponUsagesService) {}

  @Post()
  create(@Body() couponUsage: CreateCouponUsageDto) {
    return this.couponUsagesService.create(couponUsage);
  }

  @Get()
  query(@Query() query: QueryCouponUsageDto) {
    return this.couponUsagesService.query(query);
  }

  @Get(':userId/:couponId/:orderId')
  findOne(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('couponId', ParseIntPipe) couponId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.couponUsagesService.findOne(userId, couponId, orderId);
  }

  @Delete(':userId/:couponId/:orderId')
  remove(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('couponId', ParseIntPipe) couponId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.couponUsagesService.remove(userId, couponId, orderId);
  }
}
