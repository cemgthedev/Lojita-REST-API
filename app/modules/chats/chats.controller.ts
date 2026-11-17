import { QueryChatDto } from '@/modules/chats/dto/query-chat.dto';
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
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post()
  create(@Body() chat: CreateChatDto) {
    return this.chatsService.create(chat);
  }

  @Get()
  findAll(@Query() query: QueryChatDto) {
    return this.chatsService.query(query);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.chatsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() chat: UpdateChatDto,
  ) {
    return this.chatsService.update(+id, chat);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.chatsService.remove(+id);
  }
}
