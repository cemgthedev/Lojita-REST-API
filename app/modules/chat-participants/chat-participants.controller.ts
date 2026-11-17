import { QueryChatParticipantDto } from '@/modules/chat-participants/dto/query-chat-participant.dto';
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
import { ChatParticipantsService } from './chat-participants.service';
import { CreateChatParticipantDto } from './dto/create-chat-participant.dto';
import { UpdateChatParticipantDto } from './dto/update-chat-participant.dto';

@Controller('chat-participants')
export class ChatParticipantsController {
  constructor(
    private readonly chatParticipantsService: ChatParticipantsService,
  ) {}

  @Post()
  create(@Body() chatParticipant: CreateChatParticipantDto) {
    return this.chatParticipantsService.create(chatParticipant);
  }

  @Get()
  findAll(@Query() query: QueryChatParticipantDto) {
    return this.chatParticipantsService.query(query);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.chatParticipantsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() chatParticipant: UpdateChatParticipantDto,
  ) {
    return this.chatParticipantsService.update(+id, chatParticipant);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.chatParticipantsService.remove(+id);
  }
}
