import { PaginationDto } from '@/common/dtos/pagination.dto';
import { CHAT_TYPE } from '@/modules/chats/enums/chat-type.entity';
import { IsEnum, IsOptional } from 'class-validator';

export class QueryChatDto extends PaginationDto {
  @IsOptional()
  @IsEnum(CHAT_TYPE)
  type?: CHAT_TYPE;
}
