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
import { CreateAttributesValueDto } from './dto/create-attributes-value.dto';
import { QueryAttributesValueDto } from './dto/query-attributes-value.dto';
import { UpdateAttributesValueDto } from './dto/update-attributes-value.dto';
import { AttributesValuesService } from './attributes-values.service';

@Controller('attributes-values')
export class AttributesValuesController {
  constructor(
    private readonly attributesValuesService: AttributesValuesService,
  ) {}

  @Post()
  create(@Body() attributesValue: CreateAttributesValueDto) {
    return this.attributesValuesService.create(attributesValue);
  }

  @Get()
  query(@Query() query: QueryAttributesValueDto) {
    return this.attributesValuesService.query(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.attributesValuesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() attributesValue: UpdateAttributesValueDto,
  ) {
    return this.attributesValuesService.update(id, attributesValue);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.attributesValuesService.remove(id);
  }
}
