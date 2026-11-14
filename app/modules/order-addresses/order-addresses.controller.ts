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
import { CreateOrderAddressDto } from './dto/create-order-address.dto';
import { QueryOrderAddressDto } from './dto/query-order-address.dto';
import { UpdateOrderAddressDto } from './dto/update-order-address.dto';
import { OrderAddressesService } from './order-addresses.service';

@Controller('order-addresses')
export class OrderAddressesController {
  constructor(private readonly orderAddressesService: OrderAddressesService) {}

  @Post()
  create(@Body() orderAddress: CreateOrderAddressDto) {
    return this.orderAddressesService.create(orderAddress);
  }

  @Get()
  query(@Query() query: QueryOrderAddressDto) {
    return this.orderAddressesService.query(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orderAddressesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() orderAddress: UpdateOrderAddressDto,
  ) {
    return this.orderAddressesService.update(id, orderAddress);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.orderAddressesService.remove(id);
  }
}
