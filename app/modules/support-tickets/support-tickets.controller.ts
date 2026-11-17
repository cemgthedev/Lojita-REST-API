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
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { QuerySupportTicketDto } from './dto/query-support-ticket.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';
import { SupportTicketsService } from './support-tickets.service';

@Controller('support-tickets')
export class SupportTicketsController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  @Post()
  create(@Body() supportTicket: CreateSupportTicketDto) {
    return this.supportTicketsService.create(supportTicket);
  }

  @Get()
  query(@Query() query: QuerySupportTicketDto) {
    return this.supportTicketsService.query(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.supportTicketsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() supportTicket: UpdateSupportTicketDto,
  ) {
    return this.supportTicketsService.update(id, supportTicket);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.supportTicketsService.remove(id);
  }
}
