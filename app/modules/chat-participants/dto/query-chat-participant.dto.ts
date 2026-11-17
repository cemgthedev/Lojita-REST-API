import { PaginationDto } from '@/common/dtos/pagination.dto';
import { Role } from '@/modules/users/enums/role.enum';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';

export class QueryChatParticipantDto extends PaginationDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  chatId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  userId?: number;
}
