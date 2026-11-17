import { ChatParticipant } from '@/entities/chat-participant.entity';
import { ChatsModule } from '@/modules/chats/chats.module';
import { UsersModule } from '@/modules/users/users.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatParticipantsController } from './chat-participants.controller';
import { ChatParticipantsService } from './chat-participants.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatParticipant]), ChatsModule, UsersModule],
  controllers: [ChatParticipantsController],
  providers: [ChatParticipantsService],
  exports: [ChatParticipantsService],
})
export class ChatParticipantsModule {}
