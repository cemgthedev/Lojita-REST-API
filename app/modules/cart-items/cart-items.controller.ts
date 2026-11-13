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
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { QueryCartItemDto } from './dto/query-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItemsService } from './cart-items.service';

@Controller('cart-items')
export class CartItemsController {
  constructor(private readonly cartItemsService: CartItemsService) {}

  @Post()
  create(@Body() cartItem: CreateCartItemDto) {
    return this.cartItemsService.create(cartItem);
  }

  @Get()
  query(@Query() query: QueryCartItemDto) {
    return this.cartItemsService.query(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cartItemsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() cartItem: UpdateCartItemDto,
  ) {
    return this.cartItemsService.update(id, cartItem);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cartItemsService.remove(id);
  }
}
