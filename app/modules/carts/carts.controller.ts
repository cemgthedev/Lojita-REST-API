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
import { CreateCartDto } from './dto/create-cart.dto';
import { QueryCartDto } from './dto/query-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { CartsService } from './carts.service';

@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Post()
  create(@Body() cart: CreateCartDto) {
    return this.cartsService.create(cart);
  }

  @Get()
  query(@Query() query: QueryCartDto) {
    return this.cartsService.query(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cartsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() cart: UpdateCartDto) {
    return this.cartsService.update(id, cart);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cartsService.remove(id);
  }
}
