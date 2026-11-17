import { CHAT_TYPE } from '@/modules/chats/enums/chat-type.entity';
import { IsEnum, IsOptional } from 'class-validator';

export class CreateChatDto {
  @IsOptional()
  @IsEnum(CHAT_TYPE)
  type?: CHAT_TYPE;
}
