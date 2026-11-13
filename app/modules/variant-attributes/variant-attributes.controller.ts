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
import { CreateVariantAttributeDto } from './dto/create-variant-attribute.dto';
import { QueryVariantAttributeDto } from './dto/query-variant-attribute.dto';
import { UpdateVariantAttributeDto } from './dto/update-variant-attribute.dto';
import { VariantAttributesService } from './variant-attributes.service';

@Controller('variant-attributes')
export class VariantAttributesController {
  constructor(
    private readonly variantAttributesService: VariantAttributesService,
  ) {}

  @Post()
  create(@Body() variantAttribute: CreateVariantAttributeDto) {
    return this.variantAttributesService.create(variantAttribute);
  }

  @Get()
  query(@Query() query: QueryVariantAttributeDto) {
    return this.variantAttributesService.query(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.variantAttributesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() variantAttribute: UpdateVariantAttributeDto,
  ) {
    return this.variantAttributesService.update(id, variantAttribute);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.variantAttributesService.remove(id);
  }
}
