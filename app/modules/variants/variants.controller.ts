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
import { CreateVariantDto } from './dto/create-variant.dto';
import { QueryVariantDto } from './dto/query-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { VariantsService } from './variants.service';

@Controller('variants')
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Post()
  create(@Body() variant: CreateVariantDto) {
    return this.variantsService.create(variant);
  }

  @Get()
  query(@Query() query: QueryVariantDto) {
    return this.variantsService.query(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.variantsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() variant: UpdateVariantDto,
  ) {
    return this.variantsService.update(id, variant);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.variantsService.remove(id);
  }
}
