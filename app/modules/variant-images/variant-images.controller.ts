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
import { CreateVariantImageDto } from './dto/create-variant-image.dto';
import { QueryVariantImageDto } from './dto/query-variant-image.dto';
import { UpdateVariantImageDto } from './dto/update-variant-image.dto';
import { VariantImagesService } from './variant-images.service';

@Controller('variant-images')
export class VariantImagesController {
  constructor(private readonly variantImagesService: VariantImagesService) {}

  @Post()
  create(@Body() variantImage: CreateVariantImageDto) {
    return this.variantImagesService.create(variantImage);
  }

  @Get()
  query(@Query() query: QueryVariantImageDto) {
    return this.variantImagesService.query(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.variantImagesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() variantImage: UpdateVariantImageDto,
  ) {
    return this.variantImagesService.update(id, variantImage);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.variantImagesService.remove(id);
  }
}
