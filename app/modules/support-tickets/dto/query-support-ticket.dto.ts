import { PaginationDto } from '@/common/dtos/pagination.dto';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import {
  TICKET_MOTIVE,
  TICKET_ORIGIN,
  TICKET_PRIORITY,
  TICKET_STATUS,
} from '../enums/ticket.enum';

export class QuerySupportTicketDto extends PaginationDto {
  @IsOptional()
  @IsEnum(TICKET_ORIGIN)
  origin?: TICKET_ORIGIN;

  @IsOptional()
  @IsEnum(TICKET_PRIORITY)
  priority?: TICKET_PRIORITY;

  @IsOptional()
  @IsEnum(TICKET_STATUS)
  status?: TICKET_STATUS;

  @IsOptional()
  @IsEnum(TICKET_MOTIVE)
  motive?: TICKET_MOTIVE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requesterId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  chatId?: number;
}
