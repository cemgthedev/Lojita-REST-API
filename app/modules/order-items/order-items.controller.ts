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
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { QueryOrderItemDto } from './dto/query-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { OrderItemsService } from './order-items.service';

@Controller('order-items')
export class OrderItemsController {
  constructor(private readonly orderItemsService: OrderItemsService) {}

  @Post()
  create(@Body() orderItem: CreateOrderItemDto) {
    return this.orderItemsService.create(orderItem);
  }

  @Get()
  query(@Query() query: QueryOrderItemDto) {
    return this.orderItemsService.query(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orderItemsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() orderItem: UpdateOrderItemDto,
  ) {
    return this.orderItemsService.update(id, orderItem);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.orderItemsService.remove(id);
  }
}
