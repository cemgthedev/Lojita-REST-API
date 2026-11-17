import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  TICKET_MOTIVE,
  TICKET_ORIGIN,
  TICKET_PRIORITY,
  TICKET_STATUS,
} from '../enums/ticket.enum';

export class CreateSupportTicketDto {
  @IsEnum(TICKET_ORIGIN)
  origin!: TICKET_ORIGIN;

  @IsEnum(TICKET_MOTIVE)
  motive!: TICKET_MOTIVE;

  @IsEnum(TICKET_PRIORITY)
  priority!: TICKET_PRIORITY;

  @IsEnum(TICKET_STATUS)
  status!: TICKET_STATUS;

  @IsOptional()
  @IsString()
  description?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  requesterId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  chatId?: number | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  closedAt?: Date | null;
}
