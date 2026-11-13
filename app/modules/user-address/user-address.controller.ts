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
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { QueryUserAddressDto } from './dto/query-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { UserAddressService } from './user-address.service';

@Controller('user-address')
export class UserAddressController {
  constructor(private readonly userAddressService: UserAddressService) {}

  @Post()
  create(@Body() userAddress: CreateUserAddressDto) {
    return this.userAddressService.create(userAddress);
  }

  @Get()
  query(@Query() query: QueryUserAddressDto) {
    return this.userAddressService.query(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userAddressService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() userAddress: UpdateUserAddressDto,
  ) {
    return this.userAddressService.update(id, userAddress);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userAddressService.remove(id);
  }
}
