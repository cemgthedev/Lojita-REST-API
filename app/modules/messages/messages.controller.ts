import { QueryMessageDto } from '@/modules/messages/dto/query-message.dto';
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
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@Body() message: CreateMessageDto) {
    return this.messagesService.create(message);
  }

  @Get()
  findAll(@Query() query: QueryMessageDto) {
    return this.messagesService.query(query);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.messagesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() message: UpdateMessageDto,
  ) {
    return this.messagesService.update(+id, message);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.messagesService.remove(+id);
  }
}
