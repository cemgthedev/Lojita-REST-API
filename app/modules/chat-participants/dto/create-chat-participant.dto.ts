import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { Role } from '@/modules/users/enums/role.enum';

export class CreateChatParticipantDto {
  @IsEnum(Role)
  @IsNotEmpty()
  role!: Role;

  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  chatId!: number;

  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  userId!: number;
}
