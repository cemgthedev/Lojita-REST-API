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
import { CreateSpecificationDto } from './dto/create-specification.dto';
import { QuerySpecificationDto } from './dto/query-specification.dto';
import { UpdateSpecificationDto } from './dto/update-specification.dto';
import { SpecificationsService } from './specifications.service';

@Controller('specifications')
export class SpecificationsController {
  constructor(private readonly specificationsService: SpecificationsService) {}

  @Post()
  create(@Body() specification: CreateSpecificationDto) {
    return this.specificationsService.create(specification);
  }

  @Get()
  query(@Query() query: QuerySpecificationDto) {
    return this.specificationsService.query(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.specificationsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() specification: UpdateSpecificationDto,
  ) {
    return this.specificationsService.update(id, specification);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.specificationsService.remove(id);
  }
}
