import { AttributesService } from '@/modules/attributes/attribute.service';
import { CreateAttributeDto } from '@/modules/attributes/dto/create-attribute.dto';
import { UpdateAttributeDto } from '@/modules/attributes/dto/update-attribute.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Post()
  create(@Body() attribute: CreateAttributeDto) {
    return this.attributesService.create(attribute);
  }

  @Get()
  findAll() {
    return this.attributesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.attributesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() attribute: UpdateAttributeDto,
  ) {
    return this.attributesService.update(id, attribute);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.attributesService.remove(id);
  }
}
