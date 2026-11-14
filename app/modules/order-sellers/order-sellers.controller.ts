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
import { CreateOrderSellerDto } from './dto/create-order-seller.dto';
import { QueryOrderSellerDto } from './dto/query-order-seller.dto';
import { UpdateOrderSellerDto } from './dto/update-order-seller.dto';
import { OrderSellersService } from './order-sellers.service';

@Controller('order-sellers')
export class OrderSellersController {
  constructor(private readonly orderSellersService: OrderSellersService) {}

  @Post()
  create(@Body() orderSeller: CreateOrderSellerDto) {
    return this.orderSellersService.create(orderSeller);
  }

  @Get()
  query(@Query() query: QueryOrderSellerDto) {
    return this.orderSellersService.query(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orderSellersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() orderSeller: UpdateOrderSellerDto,
  ) {
    return this.orderSellersService.update(id, orderSeller);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.orderSellersService.remove(id);
  }
}
